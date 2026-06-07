mod db;
mod knowledge;
mod llm;
mod logger;
mod secret;

use db::{DbConn, init_db};
use llm::init_llm_tables;
use logger::Logger;
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

fn check_db_integrity(conn: &Connection) -> bool {
    match conn.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0)) {
        Ok(result) => result == "ok",
        Err(_) => false,
    }
}

fn backup_db(db_path: &std::path::Path) -> Option<std::path::PathBuf> {
    let backup_path = db_path.with_extension("db.bak");
    if std::fs::copy(db_path, &backup_path).is_ok() {
        return Some(backup_path);
    }
    None
}

fn delete_db_files(db_path: &std::path::Path) {
    let _ = std::fs::remove_file(db_path);
    let _ = std::fs::remove_file(db_path.with_extension("db-wal"));
    let _ = std::fs::remove_file(db_path.with_extension("db-shm"));
}

fn try_restore_from_backup(db_path: &std::path::Path) -> bool {
    let backup_path = db_path.with_extension("db.bak");
    if backup_path.exists() {
        delete_db_files(db_path);
        let restored_path = db_path.with_extension("db.restored");
        if std::fs::copy(&backup_path, &restored_path).is_ok() {
            if let Ok(conn) = Connection::open(&restored_path) {
                if check_db_integrity(&conn) {
                    drop(conn);
                    let _ = std::fs::rename(&restored_path, db_path);
                    return true;
                }
            }
        }
        let _ = std::fs::remove_file(&restored_path);
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).ok();
            let log_path = app_dir.join("novelcraft.log");
            let logger = Logger::new(log_path.to_string_lossy().to_string());
            logger.log("INFO", "app", "Application starting");
            app.manage(logger);

            let db_path = app_dir.join("novelcraft.db");
            let conn = Connection::open(&db_path).expect("Failed to open database");
            conn.pragma_update(None, "journal_mode", "WAL").ok();
            conn.pragma_update(None, "foreign_keys", "ON").ok();

            if !check_db_integrity(&conn) {
                eprintln!("[DB] Integrity check failed, attempting restore from backup");
                drop(conn);
                if try_restore_from_backup(&db_path) {
                    let conn2 = Connection::open(&db_path).expect("Failed to reopen database after restore");
                    conn2.pragma_update(None, "journal_mode", "WAL").ok();
                    conn2.pragma_update(None, "foreign_keys", "ON").ok();
                    init_db(&conn2);
                    backup_db(&db_path);
                    app.manage(DbConn(Mutex::new(conn2)));
                } else {
                    delete_db_files(&db_path);
                    let conn2 = Connection::open(&db_path).expect("Failed to recreate database");
                    conn2.pragma_update(None, "journal_mode", "WAL").ok();
                    conn2.pragma_update(None, "foreign_keys", "ON").ok();
                    init_db(&conn2);
                    backup_db(&db_path);
                    app.manage(DbConn(Mutex::new(conn2)));
                }
            } else {
                init_db(&conn);
                backup_db(&db_path);
                init_llm_tables(&conn);
                app.manage(DbConn(Mutex::new(conn)));
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::create_book,
            db::list_books,
            db::update_book,
            db::delete_book,
            db::create_chapter,
            db::list_chapters,
            db::update_chapter_content,
            db::update_chapter_status,
            db::delete_chapter,
            db::reorder_chapters,
            llm::create_llm_provider,
            llm::list_llm_providers,
            llm::update_llm_provider,
            llm::delete_llm_provider,
            llm::test_llm_provider,
            llm::call_llm,
            llm::fetch_models,
            secret::set_provider_secret,
            secret::get_provider_secret,
            secret::delete_provider_secret,
            knowledge::create_knowledge_source,
            knowledge::list_knowledge_sources,
            knowledge::update_knowledge_source,
            knowledge::delete_knowledge_source,
            knowledge::create_knowledge_item,
            knowledge::list_knowledge_items,
            knowledge::update_knowledge_item,
            knowledge::create_knowledge_tag,
            knowledge::list_knowledge_tags,
            knowledge::update_knowledge_tag,
            knowledge::delete_knowledge_tag,
            knowledge::attach_knowledge_tag_to_item,
            knowledge::detach_knowledge_tag_from_item,
            knowledge::list_knowledge_item_tags,
            db::create_outline_node,
            db::list_outlines,
            db::update_outline_node,
            db::delete_outline_node,
            db::save_chapter_version,
            db::list_chapter_versions,
            db::revert_chapter_to_version,
            db::save_temporal_facts,
            db::query_temporal_facts,
            db::invalidate_temporal_facts,
            db::save_truth_file,
            db::load_truth_file,
            db::load_all_truth_files,
            db::delete_truth_file,
            db::export_book_data,
            db::import_book_data,
            db::save_chat_message,
            db::list_chat_messages,
            db::clear_chat_messages,
            logger::log_message,
            logger::read_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
