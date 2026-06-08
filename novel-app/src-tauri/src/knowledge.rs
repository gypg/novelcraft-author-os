use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DbConn;

pub fn run_knowledge_migration_v3(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS knowledge_sources (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT '',
            source_type TEXT NOT NULL DEFAULT 'unknown'
                CHECK (source_type IN ('public_domain', 'user_original', 'copyrighted', 'unknown')),
            publication_year INTEGER,
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_sources_source_type ON knowledge_sources(source_type);
        CREATE INDEX IF NOT EXISTS idx_knowledge_sources_title ON knowledge_sources(title);

        CREATE TABLE IF NOT EXISTS knowledge_items (
            id TEXT PRIMARY KEY,
            source_id TEXT REFERENCES knowledge_sources(id) ON DELETE SET NULL,
            book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
            library_type TEXT NOT NULL CHECK (library_type IN ('external', 'project', 'author')),
            canonical_level TEXT NOT NULL CHECK (canonical_level IN ('canonical', 'reference', 'inspiration')),
            item_type TEXT NOT NULL CHECK (item_type IN ('quote', 'note', 'character', 'location', 'object', 'hook', 'summary', 'idea', 'technique', 'analysis')),
            content TEXT NOT NULL,
            quote_policy TEXT NOT NULL DEFAULT 'not_applicable'
                CHECK (quote_policy IN ('direct_allowed', 'paraphrase_recommended', 'direct_forbidden', 'not_applicable')),
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('proposal', 'pending', 'confirmed', 'archived')),
            metadata_json TEXT NOT NULL DEFAULT '{}',
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            CHECK (library_type != 'project' OR book_id IS NOT NULL),
            CHECK (library_type != 'external' OR canonical_level = 'inspiration'),
            CHECK (library_type != 'author' OR canonical_level = 'reference'),
            CHECK (library_type != 'project' OR canonical_level = 'canonical')
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_source_id ON knowledge_items(source_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_book_id ON knowledge_items(book_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_status ON knowledge_items(status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_library_status ON knowledge_items(library_type, status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_book_status_type ON knowledge_items(book_id, status, item_type);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_type_status ON knowledge_items(item_type, status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_updated_at ON knowledge_items(updated_at);

        CREATE TABLE IF NOT EXISTS knowledge_tags (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL CHECK (category IN ('usage', 'scene', 'emotion', 'genre', 'technique', 'position', 'custom')),
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(category, name)
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_tags_category ON knowledge_tags(category);

        CREATE TABLE IF NOT EXISTS knowledge_item_tags (
            item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES knowledge_tags(id) ON DELETE CASCADE,
            PRIMARY KEY (item_id, tag_id)
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_item_tags_tag_item ON knowledge_item_tags(tag_id, item_id);

        CREATE TABLE IF NOT EXISTS knowledge_links (
            id TEXT PRIMARY KEY,
            from_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
            to_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
            relation_type TEXT NOT NULL CHECK (relation_type IN ('references', 'inspires', 'contradicts', 'supports', 'same_scene', 'same_character')),
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            CHECK (from_item_id != to_item_id)
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_links_from_item ON knowledge_links(from_item_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_links_to_item ON knowledge_links(to_item_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_links_relation ON knowledge_links(relation_type);

        CREATE TABLE IF NOT EXISTS knowledge_suggestions (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
            item_id TEXT REFERENCES knowledge_items(id) ON DELETE SET NULL,
            suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('direct_quote', 'paraphrase', 'reminder', 'style_hint')),
            reason TEXT NOT NULL DEFAULT '',
            priority_level INTEGER NOT NULL CHECK (priority_level BETWEEN 1 AND 3),
            status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN ('shown', 'inserted', 'dismissed', 'blocked')),
            quote_policy TEXT NOT NULL DEFAULT 'not_applicable'
                CHECK (quote_policy IN ('direct_allowed', 'paraphrase_recommended', 'direct_forbidden', 'not_applicable')),
            suggested_action TEXT NOT NULL DEFAULT 'open_detail'
                CHECK (suggested_action IN ('insert_direct', 'paraphrase', 'show_reminder', 'open_detail', 'block')),
            score REAL NOT NULL DEFAULT 0,
            score_breakdown_json TEXT NOT NULL DEFAULT '{}',
            conflict_flags_json TEXT NOT NULL DEFAULT '[]',
            trace_json TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_book_chapter ON knowledge_suggestions(book_id, chapter_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_status ON knowledge_suggestions(status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_item_id ON knowledge_suggestions(item_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_book_status ON knowledge_suggestions(book_id, status, created_at);"
    ).expect("Knowledge migration v3 failed");
}

#[derive(Debug, Serialize)]
pub struct KnowledgeSourceRow {
    pub id: String,
    pub title: String,
    pub author: String,
    pub source_type: String,
    pub publication_year: Option<i64>,
    pub notes: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
pub struct KnowledgeItemRow {
    pub id: String,
    pub source_id: Option<String>,
    pub book_id: Option<String>,
    pub library_type: String,
    pub canonical_level: String,
    pub item_type: String,
    pub content: String,
    pub quote_policy: String,
    pub status: String,
    pub metadata_json: String,
    pub notes: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize)]
pub struct KnowledgeTagRow {
    pub id: String,
    pub category: String,
    pub name: String,
    pub color: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateKnowledgeSourceInput {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub author: String,
    pub source_type: String,
    pub publication_year: Option<i64>,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateKnowledgeSourceInput {
    pub title: Option<String>,
    pub author: Option<String>,
    pub source_type: Option<String>,
    pub publication_year: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateKnowledgeItemInput {
    pub id: String,
    pub source_id: Option<String>,
    pub book_id: Option<String>,
    pub library_type: String,
    pub canonical_level: String,
    pub item_type: String,
    pub content: String,
    pub quote_policy: String,
    pub status: String,
    pub metadata_json: String,
    pub notes: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateKnowledgeItemInput {
    pub source_id: Option<String>,
    pub book_id: Option<String>,
    pub library_type: Option<String>,
    pub canonical_level: Option<String>,
    pub item_type: Option<String>,
    pub content: Option<String>,
    pub quote_policy: Option<String>,
    pub status: Option<String>,
    pub metadata_json: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListKnowledgeItemsFilter {
    pub keyword: Option<String>,
    pub book_id: Option<String>,
    pub source_id: Option<String>,
    pub library_type: Option<String>,
    pub library_types: Option<Vec<String>>,
    pub item_type: Option<String>,
    pub status: Option<String>,
    pub quote_policy: Option<String>,
    pub tag_id: Option<String>,
    pub tag_category: Option<String>,
    pub include_archived: Option<bool>,
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct CreateKnowledgeTagInput {
    pub id: String,
    pub category: String,
    pub name: String,
    #[serde(default)]
    pub color: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateKnowledgeTagInput {
    pub category: Option<String>,
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListKnowledgeTagsFilter {
    pub category: Option<String>,
    pub keyword: Option<String>,
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn source_by_id(conn: &Connection, id: &str) -> Result<KnowledgeSourceRow, String> {
    conn.query_row(
        "SELECT id, title, author, source_type, publication_year, notes, created_at, updated_at FROM knowledge_sources WHERE id = ?1",
        params![id],
        |row| Ok(KnowledgeSourceRow {
            id: row.get(0)?,
            title: row.get(1)?,
            author: row.get(2)?,
            source_type: row.get(3)?,
            publication_year: row.get(4)?,
            notes: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        }),
    ).map_err(|e| e.to_string())
}

fn item_by_id(conn: &Connection, id: &str) -> Result<KnowledgeItemRow, String> {
    conn.query_row(
        "SELECT id, source_id, book_id, library_type, canonical_level, item_type, content, quote_policy, status, metadata_json, notes, created_at, updated_at FROM knowledge_items WHERE id = ?1",
        params![id],
        |row| Ok(KnowledgeItemRow {
            id: row.get(0)?,
            source_id: row.get(1)?,
            book_id: row.get(2)?,
            library_type: row.get(3)?,
            canonical_level: row.get(4)?,
            item_type: row.get(5)?,
            content: row.get(6)?,
            quote_policy: row.get(7)?,
            status: row.get(8)?,
            metadata_json: row.get(9)?,
            notes: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        }),
    ).map_err(|e| e.to_string())
}

fn tag_by_id(conn: &Connection, id: &str) -> Result<KnowledgeTagRow, String> {
    conn.query_row(
        "SELECT id, category, name, color, created_at, updated_at FROM knowledge_tags WHERE id = ?1",
        params![id],
        |row| Ok(KnowledgeTagRow {
            id: row.get(0)?,
            category: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_knowledge_source(state: State<'_, DbConn>, input: CreateKnowledgeSourceInput) -> Result<KnowledgeSourceRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_millis();
    conn.execute(
        "INSERT INTO knowledge_sources (id, title, author, source_type, publication_year, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![input.id, input.title, input.author, input.source_type, input.publication_year, input.notes, now, now],
    ).map_err(|e| e.to_string())?;
    source_by_id(&conn, &input.id)
}

#[tauri::command]
pub fn list_knowledge_sources(state: State<'_, DbConn>) -> Result<Vec<KnowledgeSourceRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, title, author, source_type, publication_year, notes, created_at, updated_at FROM knowledge_sources ORDER BY updated_at DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(KnowledgeSourceRow {
        id: row.get(0)?,
        title: row.get(1)?,
        author: row.get(2)?,
        source_type: row.get(3)?,
        publication_year: row.get(4)?,
        notes: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn update_knowledge_source(state: State<'_, DbConn>, id: String, input: UpdateKnowledgeSourceInput) -> Result<KnowledgeSourceRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current = source_by_id(&conn, &id)?;
    let now = now_millis();
    conn.execute(
        "UPDATE knowledge_sources SET title = ?1, author = ?2, source_type = ?3, publication_year = ?4, notes = ?5, updated_at = ?6 WHERE id = ?7",
        params![
            input.title.unwrap_or(current.title),
            input.author.unwrap_or(current.author),
            input.source_type.unwrap_or(current.source_type),
            input.publication_year.or(current.publication_year),
            input.notes.unwrap_or(current.notes),
            now,
            id,
        ],
    ).map_err(|e| e.to_string())?;
    source_by_id(&conn, &id)
}

#[tauri::command]
pub fn delete_knowledge_source(state: State<'_, DbConn>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM knowledge_sources WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_knowledge_item(state: State<'_, DbConn>, input: CreateKnowledgeItemInput) -> Result<KnowledgeItemRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_millis();
    if let Ok(existing) = item_by_id(&conn, &input.id) {
        if existing.content == input.content {
            return Ok(existing);
        }
        return Err("Knowledge item id already exists with different content".to_string());
    }
    conn.execute(
        "INSERT INTO knowledge_items (id, source_id, book_id, library_type, canonical_level, item_type, content, quote_policy, status, metadata_json, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![input.id, input.source_id, input.book_id, input.library_type, input.canonical_level, input.item_type, input.content, input.quote_policy, input.status, input.metadata_json, input.notes, now, now],
    ).map_err(|e| e.to_string())?;
    item_by_id(&conn, &input.id)
}

fn filter_knowledge_item_rows(
    rows: Vec<KnowledgeItemRow>,
    filter: &ListKnowledgeItemsFilter,
    matched_tag_item_ids: &std::collections::HashSet<String>,
) -> Vec<KnowledgeItemRow> {
    let keyword = filter.keyword.as_ref().map(|value| value.trim().to_lowercase()).filter(|value| !value.is_empty());
    let tag_filter_active = filter.tag_id.is_some() || filter.tag_category.is_some();
    let filtered_rows = rows.into_iter().filter(|item| {
        if !filter.include_archived.unwrap_or(false) && item.status == "archived" { return false; }
        if tag_filter_active && !matched_tag_item_ids.contains(&item.id) { return false; }
        if let Some(ref value) = filter.book_id { if item.library_type == "project" && item.book_id.as_ref() != Some(value) { return false; } }
        if let Some(ref value) = filter.source_id { if item.source_id.as_ref() != Some(value) { return false; } }
        if let Some(ref value) = filter.library_type { if &item.library_type != value { return false; } }
        if let Some(ref values) = filter.library_types { if !values.contains(&item.library_type) { return false; } }
        if let Some(ref value) = filter.item_type { if &item.item_type != value { return false; } }
        if let Some(ref value) = filter.status { if &item.status != value { return false; } }
        if let Some(ref value) = filter.quote_policy { if &item.quote_policy != value { return false; } }
        if let Some(ref value) = keyword {
            let haystack = format!("{}\n{}\n{}", item.content, item.notes, item.metadata_json).to_lowercase();
            if !haystack.contains(value) { return false; }
        }
        true
    });
    match filter.limit {
        Some(limit) => filtered_rows.take(limit).collect(),
        None => filtered_rows.collect(),
    }
}

#[tauri::command]
pub fn list_knowledge_items(state: State<'_, DbConn>, filter: ListKnowledgeItemsFilter) -> Result<Vec<KnowledgeItemRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, source_id, book_id, library_type, canonical_level, item_type, content, quote_policy, status, metadata_json, notes, created_at, updated_at FROM knowledge_items ORDER BY updated_at DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(KnowledgeItemRow {
        id: row.get(0)?,
        source_id: row.get(1)?,
        book_id: row.get(2)?,
        library_type: row.get(3)?,
        canonical_level: row.get(4)?,
        item_type: row.get(5)?,
        content: row.get(6)?,
        quote_policy: row.get(7)?,
        status: row.get(8)?,
        metadata_json: row.get(9)?,
        notes: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    let tag_filter_active = filter.tag_id.is_some() || filter.tag_category.is_some();
    let matched_tag_item_ids: std::collections::HashSet<String> = if tag_filter_active {
        let mut tag_stmt = conn.prepare(
            "SELECT DISTINCT it.item_id
             FROM knowledge_item_tags it
             INNER JOIN knowledge_tags t ON t.id = it.tag_id
             WHERE (?1 IS NULL OR it.tag_id = ?1)
               AND (?2 IS NULL OR t.category = ?2)",
        ).map_err(|e| e.to_string())?;
        let matched_ids = tag_stmt
            .query_map(params![filter.tag_id.as_ref(), filter.tag_category.as_ref()], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<std::collections::HashSet<_>, _>>()
            .map_err(|e| e.to_string())?;
        matched_ids
    } else {
        std::collections::HashSet::new()
    };
    Ok(filter_knowledge_item_rows(rows, &filter, &matched_tag_item_ids))
}

#[tauri::command]
pub fn update_knowledge_item(state: State<'_, DbConn>, id: String, input: UpdateKnowledgeItemInput) -> Result<KnowledgeItemRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current = item_by_id(&conn, &id)?;
    let now = now_millis();
    conn.execute(
        "UPDATE knowledge_items SET source_id = ?1, book_id = ?2, library_type = ?3, canonical_level = ?4, item_type = ?5, content = ?6, quote_policy = ?7, status = ?8, metadata_json = ?9, notes = ?10, updated_at = ?11 WHERE id = ?12",
        params![
            input.source_id.or(current.source_id),
            input.book_id.or(current.book_id),
            input.library_type.unwrap_or(current.library_type),
            input.canonical_level.unwrap_or(current.canonical_level),
            input.item_type.unwrap_or(current.item_type),
            input.content.unwrap_or(current.content),
            input.quote_policy.unwrap_or(current.quote_policy),
            input.status.unwrap_or(current.status),
            input.metadata_json.unwrap_or(current.metadata_json),
            input.notes.unwrap_or(current.notes),
            now,
            id,
        ],
    ).map_err(|e| e.to_string())?;
    item_by_id(&conn, &id)
}

#[tauri::command]
pub fn create_knowledge_tag(state: State<'_, DbConn>, input: CreateKnowledgeTagInput) -> Result<KnowledgeTagRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_millis();
    conn.execute(
        "INSERT INTO knowledge_tags (id, category, name, color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![input.id, input.category, input.name, input.color, now, now],
    ).map_err(|e| e.to_string())?;
    tag_by_id(&conn, &input.id)
}

#[tauri::command]
pub fn list_knowledge_tags(state: State<'_, DbConn>, filter: ListKnowledgeTagsFilter) -> Result<Vec<KnowledgeTagRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, category, name, color, created_at, updated_at FROM knowledge_tags ORDER BY category, name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| Ok(KnowledgeTagRow {
        id: row.get(0)?,
        category: row.get(1)?,
        name: row.get(2)?,
        color: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    let keyword = filter.keyword.map(|value| value.trim().to_lowercase()).filter(|value| !value.is_empty());
    Ok(rows.into_iter().filter(|tag| {
        if let Some(ref value) = filter.category { if &tag.category != value { return false; } }
        if let Some(ref value) = keyword { if !tag.name.to_lowercase().contains(value) { return false; } }
        true
    }).collect())
}

#[tauri::command]
pub fn update_knowledge_tag(state: State<'_, DbConn>, id: String, input: UpdateKnowledgeTagInput) -> Result<KnowledgeTagRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current = tag_by_id(&conn, &id)?;
    let now = now_millis();
    conn.execute(
        "UPDATE knowledge_tags SET category = ?1, name = ?2, color = ?3, updated_at = ?4 WHERE id = ?5",
        params![input.category.unwrap_or(current.category), input.name.unwrap_or(current.name), input.color.unwrap_or(current.color), now, id],
    ).map_err(|e| e.to_string())?;
    tag_by_id(&conn, &id)
}

#[tauri::command]
pub fn delete_knowledge_tag(state: State<'_, DbConn>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM knowledge_tags WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn attach_knowledge_tag_to_item(state: State<'_, DbConn>, item_id: String, tag_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("INSERT OR IGNORE INTO knowledge_item_tags (item_id, tag_id) VALUES (?1, ?2)", params![item_id, tag_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn detach_knowledge_tag_from_item(state: State<'_, DbConn>, item_id: String, tag_id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM knowledge_item_tags WHERE item_id = ?1 AND tag_id = ?2", params![item_id, tag_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_knowledge_item_tags(state: State<'_, DbConn>, item_id: String) -> Result<Vec<KnowledgeTagRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT t.id, t.category, t.name, t.color, t.created_at, t.updated_at
         FROM knowledge_tags t
         INNER JOIN knowledge_item_tags it ON it.tag_id = t.id
         WHERE it.item_id = ?1
         ORDER BY t.category, t.name",
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![item_id], |row| Ok(KnowledgeTagRow {
        id: row.get(0)?,
        category: row.get(1)?,
        name: row.get(2)?,
        color: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn table_exists(conn: &Connection, table: &str) -> bool {
        conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [table],
            |row| row.get::<_, i64>(0),
        ).unwrap() == 1
    }

    #[test]
    fn migration_creates_sprint_a_tables_and_is_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON; CREATE TABLE books (id TEXT PRIMARY KEY); CREATE TABLE chapters (id TEXT PRIMARY KEY, book_id TEXT REFERENCES books(id));").unwrap();

        run_knowledge_migration_v3(&conn);
        run_knowledge_migration_v3(&conn);

        for table in [
            "knowledge_sources",
            "knowledge_items",
            "knowledge_tags",
            "knowledge_item_tags",
            "knowledge_links",
            "knowledge_suggestions",
        ] {
            assert!(table_exists(&conn, table), "missing table {table}");
        }
    }

    #[test]
    fn list_filter_keeps_global_author_external_and_applies_limit() {
        let rows = filter_knowledge_item_rows(vec![
            KnowledgeItemRow {
                id: "project-1".to_string(), source_id: None, book_id: Some("book-1".to_string()), library_type: "project".to_string(), canonical_level: "canonical".to_string(),
                item_type: "note".to_string(), content: "雨夜 工厂".to_string(), quote_policy: "not_applicable".to_string(), status: "confirmed".to_string(), metadata_json: "{}".to_string(), notes: "".to_string(), created_at: 1, updated_at: 4,
            },
            KnowledgeItemRow {
                id: "project-2".to_string(), source_id: None, book_id: Some("book-2".to_string()), library_type: "project".to_string(), canonical_level: "canonical".to_string(),
                item_type: "note".to_string(), content: "雨夜 工厂".to_string(), quote_policy: "not_applicable".to_string(), status: "confirmed".to_string(), metadata_json: "{}".to_string(), notes: "".to_string(), created_at: 1, updated_at: 3,
            },
            KnowledgeItemRow {
                id: "author-1".to_string(), source_id: None, book_id: None, library_type: "author".to_string(), canonical_level: "reference".to_string(),
                item_type: "note".to_string(), content: "雨夜 工厂".to_string(), quote_policy: "not_applicable".to_string(), status: "confirmed".to_string(), metadata_json: "{}".to_string(), notes: "".to_string(), created_at: 1, updated_at: 2,
            },
            KnowledgeItemRow {
                id: "external-1".to_string(), source_id: None, book_id: None, library_type: "external".to_string(), canonical_level: "inspiration".to_string(),
                item_type: "note".to_string(), content: "雨夜 工厂".to_string(), quote_policy: "not_applicable".to_string(), status: "confirmed".to_string(), metadata_json: "{}".to_string(), notes: "".to_string(), created_at: 1, updated_at: 1,
            },
        ], &ListKnowledgeItemsFilter {
            keyword: None,
            book_id: Some("book-1".to_string()),
            source_id: None,
            library_type: None,
            library_types: Some(vec!["project".to_string(), "author".to_string(), "external".to_string()]),
            item_type: None,
            status: Some("confirmed".to_string()),
            quote_policy: None,
            tag_id: None,
            tag_category: None,
            include_archived: Some(false),
            limit: Some(2),
        }, &std::collections::HashSet::new());

        let ids: Vec<String> = rows.into_iter().map(|row| row.id).collect();
        assert_eq!(ids, vec!["project-1", "author-1"]);
    }
}
