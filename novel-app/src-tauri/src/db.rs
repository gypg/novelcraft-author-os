use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::sync::Mutex;
use tauri::State;

pub struct DbConn(pub Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize)]
pub struct BookRow {
    pub id: String,
    pub title: String,
    pub author: String,
    pub synopsis: String,
    pub cover: Option<String>,
    pub status: String,
    pub word_count: i64,
    pub target_daily_words: Option<i64>,
    pub genre: Option<String>,
    pub tags: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterRow {
    pub id: String,
    pub book_id: String,
    pub volume_id: Option<String>,
    pub title: String,
    pub order_index: i64,
    pub content: String,
    pub word_count: i64,
    pub status: String,
    pub ai_audit_score: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateBookInput {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub synopsis: String,
    pub status: Option<String>,
    pub target_daily_words: Option<i64>,
    pub genre: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBookInput {
    pub title: Option<String>,
    pub author: Option<String>,
    pub synopsis: Option<String>,
    pub cover: Option<String>,
    pub status: Option<String>,
    pub target_daily_words: Option<i64>,
    pub genre: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChapterInput {
    pub id: String,
    pub book_id: String,
    pub volume_id: Option<String>,
    pub title: String,
    pub order_index: Option<i64>,
}

pub const CURRENT_SCHEMA_VERSION: u32 = 3;

pub fn init_db(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _schema_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );"
    ).expect("Failed to create _schema_meta table");

    let current_version: u32 = conn
        .query_row(
            "SELECT value FROM _schema_meta WHERE key = 'schema_version'",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    if current_version < 1 {
        run_migration_v1(conn);
    }
    if current_version < 2 {
        run_migration_v2(conn);
    }
    if current_version < 3 {
        crate::knowledge::run_knowledge_migration_v3(conn);
    }

    conn.execute(
        "INSERT OR REPLACE INTO _schema_meta (key, value) VALUES ('schema_version', ?1)",
        params![CURRENT_SCHEMA_VERSION.to_string()],
    ).expect("Failed to update schema version");
}

fn run_migration_v1(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT '',
            synopsis TEXT NOT NULL DEFAULT '',
            cover TEXT,
            status TEXT NOT NULL DEFAULT 'ongoing',
            word_count INTEGER NOT NULL DEFAULT 0,
            target_daily_words INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chapters (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            volume_id TEXT,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            content TEXT NOT NULL DEFAULT '',
            word_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'draft',
            ai_audit_score INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);

        CREATE TABLE IF NOT EXISTS outlines (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            parent_id TEXT,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            chapter_id TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_outlines_book_id ON outlines(book_id);
        CREATE INDEX IF NOT EXISTS idx_outlines_parent_id ON outlines(parent_id);

        CREATE TABLE IF NOT EXISTS chapter_versions (
            id TEXT PRIMARY KEY,
            chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
            content_hash TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_versions_chapter_id ON chapter_versions(chapter_id);

        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            chapter_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_chat_messages_book_id ON chat_messages(book_id);

        CREATE TABLE IF NOT EXISTS temporal_facts (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
            subject TEXT NOT NULL,
            predicate TEXT NOT NULL,
            object TEXT NOT NULL,
            valid_from_chapter INTEGER NOT NULL,
            valid_until_chapter INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_temporal_facts_book_id ON temporal_facts(book_id);
        CREATE INDEX IF NOT EXISTS idx_temporal_facts_chapter ON temporal_facts(book_id, valid_from_chapter);

        CREATE TABLE IF NOT EXISTS truth_files (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            file_type TEXT NOT NULL,
            content_json TEXT NOT NULL DEFAULT '{}',
            updated_at INTEGER NOT NULL,
            UNIQUE(book_id, file_type)
        );
        CREATE INDEX IF NOT EXISTS idx_truth_files_book_id ON truth_files(book_id);"
    ).expect("Migration v1 failed");
}

fn run_migration_v2(conn: &Connection) {
    let migrations = [
        "ALTER TABLE books ADD COLUMN genre TEXT",
        "ALTER TABLE books ADD COLUMN tags TEXT",
    ];
    for sql in migrations {
        conn.execute(sql, []).ok();
    }
}

// ==================== Book Commands ====================

#[tauri::command]
pub fn create_book(state: State<'_, DbConn>, input: CreateBookInput) -> Result<BookRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let status = input.status.unwrap_or_else(|| "ongoing".to_string());

    conn.execute(
        "INSERT INTO books (id, title, author, synopsis, status, target_daily_words, genre, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![input.id, input.title, input.author, input.synopsis, status, input.target_daily_words, input.genre, input.tags, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(BookRow {
        id: input.id,
        title: input.title,
        author: input.author,
        synopsis: input.synopsis,
        cover: None,
        status,
        word_count: 0,
        target_daily_words: input.target_daily_words,
        genre: input.genre,
        tags: input.tags,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_books(state: State<'_, DbConn>) -> Result<Vec<BookRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, author, synopsis, cover, status, word_count, target_daily_words, genre, tags, created_at, updated_at FROM books ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(BookRow {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                synopsis: row.get(3)?,
                cover: row.get(4)?,
                status: row.get(5)?,
                word_count: row.get(6)?,
                target_daily_words: row.get(7)?,
                genre: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn update_book(state: State<'_, DbConn>, id: String, input: UpdateBookInput) -> Result<BookRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    // Build dynamic SET clause. values 必须与 SET 子句的占位符顺序严格对应：
    // "updated_at = ?" 对应 now，随后是各 input 字段，最后 WHERE id = ? 由 params.push(&id) 提供
    let mut sets = vec!["updated_at = ?".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    if let Some(ref v) = input.title { sets.push("title = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.author { sets.push("author = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.synopsis { sets.push("synopsis = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.cover { sets.push("cover = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.status { sets.push("status = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(v) = input.target_daily_words { sets.push("target_daily_words = ?".to_string()); values.push(Box::new(v)); }
    if let Some(ref v) = input.genre { sets.push("genre = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.tags { sets.push("tags = ?".to_string()); values.push(Box::new(v.clone())); }

    let sql = format!("UPDATE books SET {} WHERE id = ?", sets.join(", "));

    let mut params: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    params.push(&id);

    conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;

    get_book_by_id(&conn, &id).ok_or_else(|| "Book not found after update".to_string())
}

#[tauri::command]
pub fn delete_book(state: State<'_, DbConn>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chapters WHERE book_id = ?1", params![id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM books WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

fn get_book_by_id(conn: &Connection, id: &str) -> Option<BookRow> {
    conn.query_row(
        "SELECT id, title, author, synopsis, cover, status, word_count, target_daily_words, genre, tags, created_at, updated_at FROM books WHERE id = ?1",
        params![id],
        |row| {
            Ok(BookRow {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                synopsis: row.get(3)?,
                cover: row.get(4)?,
                status: row.get(5)?,
                word_count: row.get(6)?,
                target_daily_words: row.get(7)?,
                genre: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        },
    ).ok()
}

// ==================== Chapter Commands ====================

#[tauri::command]
pub fn create_chapter(state: State<'_, DbConn>, input: CreateChapterInput) -> Result<ChapterRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let order = input.order_index.unwrap_or(0);

    conn.execute(
        "INSERT INTO chapters (id, book_id, volume_id, title, order_index, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![input.id, input.book_id, input.volume_id, input.title, order, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(ChapterRow {
        id: input.id,
        book_id: input.book_id,
        volume_id: input.volume_id,
        title: input.title,
        order_index: order,
        content: String::new(),
        word_count: 0,
        status: "draft".to_string(),
        ai_audit_score: None,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_chapters(state: State<'_, DbConn>, book_id: String) -> Result<Vec<ChapterRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, book_id, volume_id, title, order_index, content, word_count, status, ai_audit_score, created_at, updated_at FROM chapters WHERE book_id = ?1 ORDER BY order_index")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![book_id], |row| {
            Ok(ChapterRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                volume_id: row.get(2)?,
                title: row.get(3)?,
                order_index: row.get(4)?,
                content: row.get(5)?,
                word_count: row.get(6)?,
                status: row.get(7)?,
                ai_audit_score: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn update_chapter_content(
    state: State<'_, DbConn>,
    chapter_id: String,
    content: String,
) -> Result<ChapterRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    // Count Chinese characters + words
    let word_count = count_words(&content) as i64;

    conn.execute(
        "UPDATE chapters SET content = ?1, word_count = ?2, updated_at = ?3 WHERE id = ?4",
        params![content, word_count, now, chapter_id],
    ).map_err(|e| e.to_string())?;

    // Recalculate book word count
    let book_id: String = conn
        .query_row("SELECT book_id FROM chapters WHERE id = ?1", params![chapter_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE books SET word_count = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE book_id = ?1), updated_at = ?2 WHERE id = ?1",
        params![book_id, now],
    ).map_err(|e| e.to_string())?;

    get_chapter_by_id(&conn, &chapter_id).ok_or_else(|| "Chapter not found after update".to_string())
}

#[tauri::command]
pub fn update_chapter_status(
    state: State<'_, DbConn>,
    chapter_id: String,
    status: String,
) -> Result<ChapterRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    conn.execute(
        "UPDATE chapters SET status = ?1, updated_at = ?2 WHERE id = ?3",
        params![status, now, chapter_id],
    ).map_err(|e| e.to_string())?;

    get_chapter_by_id(&conn, &chapter_id).ok_or_else(|| "Chapter not found after update".to_string())
}

#[tauri::command]
pub fn delete_chapter(state: State<'_, DbConn>, chapter_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    let book_id: String = conn
        .query_row("SELECT book_id FROM chapters WHERE id = ?1", params![chapter_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM chapters WHERE id = ?1", params![chapter_id]).map_err(|e| e.to_string())?;

    // Recalc book word count
    conn.execute(
        "UPDATE books SET word_count = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE book_id = ?1), updated_at = ?2 WHERE id = ?1",
        params![book_id, now],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn reorder_chapters(state: State<'_, DbConn>, chapter_ids: Vec<String>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    for (index, id) in chapter_ids.iter().enumerate() {
        conn.execute(
            "UPDATE chapters SET order_index = ?1 WHERE id = ?2",
            params![index as i64, id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn get_chapter_by_id(conn: &Connection, id: &str) -> Option<ChapterRow> {
    conn.query_row(
        "SELECT id, book_id, volume_id, title, order_index, content, word_count, status, ai_audit_score, created_at, updated_at FROM chapters WHERE id = ?1",
        params![id],
        |row| {
            Ok(ChapterRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                volume_id: row.get(2)?,
                title: row.get(3)?,
                order_index: row.get(4)?,
                content: row.get(5)?,
                word_count: row.get(6)?,
                status: row.get(7)?,
                ai_audit_score: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    ).ok()
}

/// Count words: Chinese characters each count as 1, English words separated by spaces count as 1 each
fn count_words(text: &str) -> usize {
    let mut count = 0;
    let mut in_english_word = false;

    for ch in text.chars() {
        if ('\u{4e00}'..='\u{9fff}').contains(&ch) {
            count += 1;
            in_english_word = false;
        } else if ch.is_alphanumeric() {
            if !in_english_word {
                count += 1;
                in_english_word = true;
            }
        } else {
            in_english_word = false;
        }
    }

    count
}

// ==================== Outline Commands ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct OutlineRow {
    pub id: String,
    pub book_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: String,
    pub chapter_id: Option<String>,
    pub order_index: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateOutlineInput {
    pub id: String,
    pub book_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub chapter_id: Option<String>,
    pub order_index: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOutlineInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub chapter_id: Option<Option<String>>,  // Some(None) = unset, Some(Some) = set
    pub order_index: Option<i64>,
}

#[tauri::command]
pub fn create_outline_node(state: State<'_, DbConn>, input: CreateOutlineInput) -> Result<OutlineRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    let order = input.order_index.unwrap_or(0);

    conn.execute(
        "INSERT INTO outlines (id, book_id, parent_id, title, description, chapter_id, order_index, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![input.id, input.book_id, input.parent_id, input.title, input.description, input.chapter_id, order, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(OutlineRow {
        id: input.id,
        book_id: input.book_id,
        parent_id: input.parent_id,
        title: input.title,
        description: input.description,
        chapter_id: input.chapter_id,
        order_index: order,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_outlines(state: State<'_, DbConn>, book_id: String) -> Result<Vec<OutlineRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, book_id, parent_id, title, description, chapter_id, order_index, created_at, updated_at FROM outlines WHERE book_id = ?1 ORDER BY order_index")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![book_id], |row| {
            Ok(OutlineRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                parent_id: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                chapter_id: row.get(5)?,
                order_index: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn update_outline_node(state: State<'_, DbConn>, id: String, input: UpdateOutlineInput) -> Result<OutlineRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    let mut sets = vec!["updated_at = ?".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

    if let Some(ref v) = input.title { sets.push("title = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.description { sets.push("description = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.chapter_id {
        sets.push("chapter_id = ?".to_string());
        values.push(Box::new(v.clone()));
    }
    if let Some(v) = input.order_index { sets.push("order_index = ?".to_string()); values.push(Box::new(v)); }

    let sql = format!("UPDATE outlines SET {} WHERE id = ?", sets.join(", "));
    let mut params: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    params.push(&id);
    params.push(&now);

    conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, book_id, parent_id, title, description, chapter_id, order_index, created_at, updated_at FROM outlines WHERE id = ?1",
        params![id],
        |row| {
            Ok(OutlineRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                parent_id: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                chapter_id: row.get(5)?,
                order_index: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_outline_node(state: State<'_, DbConn>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // Delete children recursively
    let children = get_child_ids(&conn, &id)?;
    for child_id in children {
        delete_outline_recursive(&conn, &child_id)?;
    }
    conn.execute("DELETE FROM outlines WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

fn get_child_ids(conn: &Connection, parent_id: &str) -> Result<Vec<String>, String> {
    let mut stmt = conn.prepare("SELECT id FROM outlines WHERE parent_id = ?1").map_err(|e| e.to_string())?;
    let ids = stmt.query_map(params![parent_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(ids)
}

fn delete_outline_recursive(conn: &Connection, id: &str) -> Result<(), String> {
    let children = get_child_ids(conn, id)?;
    for child_id in children {
        delete_outline_recursive(conn, &child_id)?;
    }
    conn.execute("DELETE FROM outlines WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== Chat Messages Commands ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessageRow {
    pub id: String,
    pub book_id: String,
    pub chapter_id: Option<String>,
    pub role: String,
    pub content: String,
    pub metadata: Option<String>,
    pub created_at: i64,
}

#[tauri::command]
pub fn save_chat_message(
    state: State<'_, DbConn>,
    book_id: String,
    chapter_id: Option<String>,
    role: String,
    content: String,
    metadata: Option<String>,
) -> Result<ChatMessageRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    let id = uuid_v4();

    conn.execute(
        "INSERT INTO chat_messages (id, book_id, chapter_id, role, content, metadata, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, book_id, chapter_id, role, content, metadata, now],
    ).map_err(|e| e.to_string())?;

    Ok(ChatMessageRow {
        id,
        book_id,
        chapter_id,
        role,
        content,
        metadata,
        created_at: now,
    })
}

#[tauri::command]
pub fn list_chat_messages(
    state: State<'_, DbConn>,
    book_id: String,
    chapter_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<ChatMessageRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let max = limit.unwrap_or(100);

    let rows = match chapter_id {
        Some(ch_id) => {
            let mut stmt = conn
                .prepare("SELECT id, book_id, chapter_id, role, content, metadata, created_at FROM chat_messages WHERE book_id = ?1 AND chapter_id = ?2 ORDER BY created_at ASC LIMIT ?3")
                .map_err(|e| e.to_string())?;
            let result: Vec<ChatMessageRow> = stmt.query_map(params![book_id, ch_id, max], |row| {
                Ok(ChatMessageRow {
                    id: row.get(0)?,
                    book_id: row.get(1)?,
                    chapter_id: row.get(2)?,
                    role: row.get(3)?,
                    content: row.get(4)?,
                    metadata: row.get(5)?,
                    created_at: row.get(6)?,
                })
            }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
            result
        }
        None => {
            let mut stmt = conn
                .prepare("SELECT id, book_id, chapter_id, role, content, metadata, created_at FROM chat_messages WHERE book_id = ?1 ORDER BY created_at ASC LIMIT ?2")
                .map_err(|e| e.to_string())?;
            let result: Vec<ChatMessageRow> = stmt.query_map(params![book_id, max], |row| {
                Ok(ChatMessageRow {
                    id: row.get(0)?,
                    book_id: row.get(1)?,
                    chapter_id: row.get(2)?,
                    role: row.get(3)?,
                    content: row.get(4)?,
                    metadata: row.get(5)?,
                    created_at: row.get(6)?,
                })
            }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
            result
        }
    };

    Ok(rows)
}

#[tauri::command]
pub fn clear_chat_messages(
    state: State<'_, DbConn>,
    book_id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chat_messages WHERE book_id = ?1", params![book_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

// ==================== Version History Commands ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterVersionRow {
    pub id: String,
    pub chapter_id: String,
    pub content_hash: String,
    pub content: String,
    pub created_at: i64,
}

const MAX_VERSIONS_PER_CHAPTER: usize = 50;

#[tauri::command]
pub fn save_chapter_version(
    state: State<'_, DbConn>,
    chapter_id: String,
    content: String,
) -> Result<ChapterVersionRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    // Compute SHA-256 hash
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let hash = hex::encode(hasher.finalize());

    // Check if latest version has same hash (dedup)
    let latest_hash: Option<String> = conn
        .query_row(
            "SELECT content_hash FROM chapter_versions WHERE chapter_id = ?1 ORDER BY created_at DESC LIMIT 1",
            params![chapter_id],
            |row| row.get(0),
        )
        .ok();

    if latest_hash.as_deref() == Some(hash.as_str()) {
        // Same content, skip save
        let existing = conn
            .query_row(
                "SELECT id, chapter_id, content_hash, content, created_at FROM chapter_versions WHERE chapter_id = ?1 ORDER BY created_at DESC LIMIT 1",
                params![chapter_id],
                |row| {
                    Ok(ChapterVersionRow {
                        id: row.get(0)?,
                        chapter_id: row.get(1)?,
                        content_hash: row.get(2)?,
                        content: row.get(3)?,
                        created_at: row.get(4)?,
                    })
                },
            )
            .map_err(|e| e.to_string())?;
        return Ok(existing);
    }

    let version_id = uuid_v4();

    conn.execute(
        "INSERT INTO chapter_versions (id, chapter_id, content_hash, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![version_id, chapter_id, hash, content, now],
    )
    .map_err(|e| e.to_string())?;

    // Prune to keep max 50 versions
    conn.execute(
        "DELETE FROM chapter_versions WHERE chapter_id = ?1 AND id NOT IN (SELECT id FROM chapter_versions WHERE chapter_id = ?1 ORDER BY created_at DESC LIMIT ?2)",
        params![chapter_id, MAX_VERSIONS_PER_CHAPTER as i64],
    )
    .map_err(|e| e.to_string())?;

    Ok(ChapterVersionRow {
        id: version_id,
        chapter_id,
        content_hash: hash,
        content,
        created_at: now,
    })
}

#[tauri::command]
pub fn list_chapter_versions(
    state: State<'_, DbConn>,
    chapter_id: String,
) -> Result<Vec<ChapterVersionRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, chapter_id, content_hash, content, created_at FROM chapter_versions WHERE chapter_id = ?1 ORDER BY created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![chapter_id], |row| {
            Ok(ChapterVersionRow {
                id: row.get(0)?,
                chapter_id: row.get(1)?,
                content_hash: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn revert_chapter_to_version(
    state: State<'_, DbConn>,
    chapter_id: String,
    version_id: String,
) -> Result<ChapterRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get version content
    let content: String = conn
        .query_row(
            "SELECT content FROM chapter_versions WHERE id = ?1 AND chapter_id = ?2",
            params![version_id, chapter_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Version not found: {}", e))?;

    // Update chapter content
    let now = now_ms();
    let word_count = count_words(&content) as i64;

    conn.execute(
        "UPDATE chapters SET content = ?1, word_count = ?2, updated_at = ?3 WHERE id = ?4",
        params![content, word_count, now, chapter_id],
    )
    .map_err(|e| e.to_string())?;

    // Recalculate book word count
    let book_id: String = conn
        .query_row("SELECT book_id FROM chapters WHERE id = ?1", params![chapter_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE books SET word_count = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE book_id = ?1), updated_at = ?2 WHERE id = ?1",
        params![book_id, now],
    )
    .map_err(|e| e.to_string())?;

    get_chapter_by_id(&conn, &chapter_id).ok_or_else(|| "Chapter not found after revert".to_string())
}

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let mut hasher = Sha256::new();
    hasher.update(t.to_le_bytes());
    let hash = hasher.finalize();
    format!(
        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        u32::from_le_bytes([hash[0], hash[1], hash[2], hash[3]]),
        u16::from_le_bytes([hash[4], hash[5]]),
        (u16::from_le_bytes([hash[6], hash[7]]) & 0x0FFF) | 0x4000,
        (u16::from_le_bytes([hash[8], hash[9]]) & 0x3FFF) | 0x8000,
        u64::from_le_bytes([
            hash[10], hash[11], hash[12], hash[13], hash[14], hash[15], 0, 0
        ])
    )
}

// ==================== Temporal Memory Commands ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct TemporalFactRow {
    pub id: String,
    pub book_id: String,
    pub chapter_id: String,
    pub subject: String,
    pub predicate: String,
    pub object: String,
    pub valid_from_chapter: i64,
    pub valid_until_chapter: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct NewTemporalFact {
    pub subject: String,
    pub predicate: String,
    pub object: String,
    pub valid_from_chapter: i64,
    pub valid_until_chapter: Option<i64>,
}

#[tauri::command]
pub fn save_temporal_facts(
    state: State<'_, DbConn>,
    book_id: String,
    chapter_id: String,
    facts: Vec<NewTemporalFact>,
) -> Result<Vec<TemporalFactRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    let mut rows = Vec::new();

    for fact in facts {
        let id = uuid_v4();
        conn.execute(
            "INSERT INTO temporal_facts (id, book_id, chapter_id, subject, predicate, object, valid_from_chapter, valid_until_chapter, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![id, book_id, chapter_id, fact.subject, fact.predicate, fact.object, fact.valid_from_chapter, fact.valid_until_chapter, now, now],
        ).map_err(|e| e.to_string())?;

        rows.push(TemporalFactRow {
            id,
            book_id: book_id.clone(),
            chapter_id: chapter_id.clone(),
            subject: fact.subject,
            predicate: fact.predicate,
            object: fact.object,
            valid_from_chapter: fact.valid_from_chapter,
            valid_until_chapter: fact.valid_until_chapter,
            created_at: now,
            updated_at: now,
        });
    }

    Ok(rows)
}

#[tauri::command]
pub fn query_temporal_facts(
    state: State<'_, DbConn>,
    book_id: String,
    chapter_number: i64,
) -> Result<Vec<TemporalFactRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, book_id, chapter_id, subject, predicate, object, valid_from_chapter, valid_until_chapter, created_at, updated_at
             FROM temporal_facts
             WHERE book_id = ?1
               AND valid_from_chapter <= ?2
               AND (valid_until_chapter IS NULL OR valid_until_chapter >= ?2)
             ORDER BY valid_from_chapter",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![book_id, chapter_number], |row| {
            Ok(TemporalFactRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                chapter_id: row.get(2)?,
                subject: row.get(3)?,
                predicate: row.get(4)?,
                object: row.get(5)?,
                valid_from_chapter: row.get(6)?,
                valid_until_chapter: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn invalidate_temporal_facts(
    state: State<'_, DbConn>,
    book_id: String,
    chapter_ids: Vec<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    for chapter_id in &chapter_ids {
        conn.execute(
            "UPDATE temporal_facts SET valid_until_chapter = (SELECT order_index FROM chapters WHERE id = ?1) - 1, updated_at = ?2
             WHERE book_id = ?3 AND chapter_id = ?1 AND valid_until_chapter IS NULL",
            params![chapter_id, now, book_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ==================== Truth File Commands ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct TruthFileRow {
    pub id: String,
    pub book_id: String,
    pub file_type: String,
    pub content_json: String,
    pub updated_at: i64,
}

#[tauri::command]
pub fn save_truth_file(
    state: State<'_, DbConn>,
    book_id: String,
    file_type: String,
    content_json: String,
) -> Result<TruthFileRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();

    // Upsert: insert or replace
    let id = uuid_v4();
    conn.execute(
        "INSERT INTO truth_files (id, book_id, file_type, content_json, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(book_id, file_type) DO UPDATE SET content_json = ?4, updated_at = ?5",
        params![id, book_id, file_type, content_json, now],
    ).map_err(|e| e.to_string())?;

    Ok(TruthFileRow {
        id,
        book_id,
        file_type,
        content_json,
        updated_at: now,
    })
}

#[tauri::command]
pub fn load_truth_file(
    state: State<'_, DbConn>,
    book_id: String,
    file_type: String,
) -> Result<Option<TruthFileRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT id, book_id, file_type, content_json, updated_at
         FROM truth_files WHERE book_id = ?1 AND file_type = ?2",
        params![book_id, file_type],
        |row| {
            Ok(TruthFileRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                file_type: row.get(2)?,
                content_json: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    );

    match result {
        Ok(row) => Ok(Some(row)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn load_all_truth_files(
    state: State<'_, DbConn>,
    book_id: String,
) -> Result<Vec<TruthFileRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, book_id, file_type, content_json, updated_at
             FROM truth_files WHERE book_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![book_id], |row| {
            Ok(TruthFileRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                file_type: row.get(2)?,
                content_json: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn delete_truth_file(
    state: State<'_, DbConn>,
    book_id: String,
    file_type: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM truth_files WHERE book_id = ?1 AND file_type = ?2",
        params![book_id, file_type],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== Data Export/Import Commands ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportedBook {
    pub version: u32,
    pub exported_at: i64,
    pub book: BookRow,
    pub chapters: Vec<ChapterRow>,
    pub outlines: Vec<OutlineRow>,
    pub truth_files: Vec<TruthFileRow>,
    pub temporal_facts: Vec<TemporalFactRow>,
}

#[tauri::command]
pub fn export_book_data(
    state: State<'_, DbConn>,
    book_id: String,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let book = conn.query_row(
        "SELECT id, title, author, synopsis, cover, status, word_count, target_daily_words, genre, tags, created_at, updated_at FROM books WHERE id = ?1",
        params![book_id],
        |row| {
            Ok(BookRow {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                synopsis: row.get(3)?,
                cover: row.get(4)?,
                status: row.get(5)?,
                word_count: row.get(6)?,
                target_daily_words: row.get(7)?,
                genre: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, book_id, volume_id, title, order_index, content, word_count, status, ai_audit_score, created_at, updated_at FROM chapters WHERE book_id = ?1 ORDER BY order_index")
        .map_err(|e| e.to_string())?;
    let chapters: Vec<ChapterRow> = stmt
        .query_map(params![book_id], |row| {
            Ok(ChapterRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                volume_id: row.get(2)?,
                title: row.get(3)?,
                order_index: row.get(4)?,
                content: row.get(5)?,
                word_count: row.get(6)?,
                status: row.get(7)?,
                ai_audit_score: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let mut stmt = conn
        .prepare("SELECT id, book_id, parent_id, title, description, chapter_id, order_index, created_at, updated_at FROM outlines WHERE book_id = ?1 ORDER BY order_index")
        .map_err(|e| e.to_string())?;
    let outlines: Vec<OutlineRow> = stmt
        .query_map(params![book_id], |row| {
            Ok(OutlineRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                parent_id: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                chapter_id: row.get(5)?,
                order_index: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let mut stmt = conn
        .prepare("SELECT id, book_id, file_type, content_json, updated_at FROM truth_files WHERE book_id = ?1")
        .map_err(|e| e.to_string())?;
    let truth_files: Vec<TruthFileRow> = stmt
        .query_map(params![book_id], |row| {
            Ok(TruthFileRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                file_type: row.get(2)?,
                content_json: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let mut stmt = conn
        .prepare("SELECT id, book_id, chapter_id, subject, predicate, object, valid_from_chapter, valid_until_chapter, created_at, updated_at FROM temporal_facts WHERE book_id = ?1")
        .map_err(|e| e.to_string())?;
    let temporal_facts: Vec<TemporalFactRow> = stmt
        .query_map(params![book_id], |row| {
            Ok(TemporalFactRow {
                id: row.get(0)?,
                book_id: row.get(1)?,
                chapter_id: row.get(2)?,
                subject: row.get(3)?,
                predicate: row.get(4)?,
                object: row.get(5)?,
                valid_from_chapter: row.get(6)?,
                valid_until_chapter: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let data = ExportedBook {
        version: CURRENT_SCHEMA_VERSION,
        exported_at: now_ms(),
        book,
        chapters,
        outlines,
        truth_files,
        temporal_facts,
    };

    serde_json::to_string_pretty(&data).map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
pub struct ImportBookInput {
    pub json_data: String,
    pub overwrite: bool,
}

#[tauri::command]
pub fn import_book_data(
    state: State<'_, DbConn>,
    input: ImportBookInput,
) -> Result<String, String> {
    let data: ExportedBook = serde_json::from_str(&input.json_data).map_err(|e| format!("Invalid backup format: {}", e))?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if !input.overwrite {
        let exists: bool = conn
            .query_row("SELECT COUNT(*) FROM books WHERE id = ?1", params![data.book.id], |row| row.get::<_, i64>(0))
            .map_err(|e| e.to_string())?
            > 0;
        if exists {
            return Err("Book already exists. Set overwrite=true to replace.".to_string());
        }
    } else {
        conn.execute("DELETE FROM temporal_facts WHERE book_id = ?1", params![data.book.id]).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM truth_files WHERE book_id = ?1", params![data.book.id]).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM outlines WHERE book_id = ?1", params![data.book.id]).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM chapter_versions WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?1)", params![data.book.id]).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM chapters WHERE book_id = ?1", params![data.book.id]).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM books WHERE id = ?1", params![data.book.id]).map_err(|e| e.to_string())?;
    }

    let b = &data.book;
    conn.execute(
        "INSERT INTO books (id, title, author, synopsis, cover, status, word_count, target_daily_words, genre, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![b.id, b.title, b.author, b.synopsis, b.cover, b.status, b.word_count, b.target_daily_words, b.genre, b.tags, b.created_at, b.updated_at],
    ).map_err(|e| e.to_string())?;

    for ch in &data.chapters {
        conn.execute(
            "INSERT INTO chapters (id, book_id, volume_id, title, order_index, content, word_count, status, ai_audit_score, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![ch.id, ch.book_id, ch.volume_id, ch.title, ch.order_index, ch.content, ch.word_count, ch.status, ch.ai_audit_score, ch.created_at, ch.updated_at],
        ).map_err(|e| e.to_string())?;
    }

    for ol in &data.outlines {
        conn.execute(
            "INSERT INTO outlines (id, book_id, parent_id, title, description, chapter_id, order_index, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![ol.id, ol.book_id, ol.parent_id, ol.title, ol.description, ol.chapter_id, ol.order_index, ol.created_at, ol.updated_at],
        ).map_err(|e| e.to_string())?;
    }

    for tf in &data.truth_files {
        conn.execute(
            "INSERT INTO truth_files (id, book_id, file_type, content_json, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(book_id, file_type) DO UPDATE SET content_json = ?4, updated_at = ?5",
            params![tf.id, tf.book_id, tf.file_type, tf.content_json, tf.updated_at],
        ).map_err(|e| e.to_string())?;
    }

    for fact in &data.temporal_facts {
        conn.execute(
            "INSERT INTO temporal_facts (id, book_id, chapter_id, subject, predicate, object, valid_from_chapter, valid_until_chapter, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![fact.id, fact.book_id, fact.chapter_id, fact.subject, fact.predicate, fact.object, fact.valid_from_chapter, fact.valid_until_chapter, fact.created_at, fact.updated_at],
        ).map_err(|e| e.to_string())?;
    }

    Ok(data.book.id.clone())
}
