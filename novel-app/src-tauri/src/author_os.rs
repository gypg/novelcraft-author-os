use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::DbConn;

const MAX_ID_LEN: usize = 80;
const MAX_NAME_LEN: usize = 80;
const MAX_SHORT_TEXT_LEN: usize = 240;
const MAX_LONG_TEXT_LEN: usize = 2_000;
const MAX_LIST_ITEMS: usize = 50;
const MAX_LIST_ITEM_LEN: usize = 80;

pub fn run_author_profile_migration_v4(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS author_profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            preferred_genres TEXT NOT NULL DEFAULT '[]',
            writing_style TEXT NOT NULL DEFAULT '',
            common_phrases TEXT NOT NULL DEFAULT '[]',
            favorite_themes TEXT NOT NULL DEFAULT '[]',
            forbidden_words TEXT NOT NULL DEFAULT '[]',
            pov_preference TEXT NOT NULL DEFAULT '',
            pace_preference TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_author_profiles_updated_at ON author_profiles(updated_at);"
    ).expect("Author Profile migration v4 failed");
}

#[derive(Debug, Serialize)]
pub struct AuthorProfileRow {
    pub id: String,
    pub name: String,
    pub preferred_genres: String,
    pub writing_style: String,
    pub common_phrases: String,
    pub favorite_themes: String,
    pub forbidden_words: String,
    pub pov_preference: String,
    pub pace_preference: String,
    pub notes: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateAuthorProfileInput {
    pub id: String,
    pub name: String,
    #[serde(default = "default_json_array")]
    pub preferred_genres: String,
    #[serde(default)]
    pub writing_style: String,
    #[serde(default = "default_json_array")]
    pub common_phrases: String,
    #[serde(default = "default_json_array")]
    pub favorite_themes: String,
    #[serde(default = "default_json_array")]
    pub forbidden_words: String,
    #[serde(default)]
    pub pov_preference: String,
    #[serde(default)]
    pub pace_preference: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAuthorProfileInput {
    pub name: Option<String>,
    pub preferred_genres: Option<String>,
    pub writing_style: Option<String>,
    pub common_phrases: Option<String>,
    pub favorite_themes: Option<String>,
    pub forbidden_words: Option<String>,
    pub pov_preference: Option<String>,
    pub pace_preference: Option<String>,
    pub notes: Option<String>,
}

fn default_json_array() -> String {
    "[]".to_string()
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

fn validate_profile_id(id: &str) -> Result<String, String> {
    let trimmed = id.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_ID_LEN {
        return Err("Author profile id is invalid".to_string());
    }
    if !trimmed.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_') {
        return Err("Author profile id contains unsupported characters".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_text_field(value: &str, max_len: usize, field: &str) -> Result<String, String> {
    let normalized = value.replace(['\u{0000}', '\u{0008}', '\u{000C}'], "").trim().to_string();
    if normalized.chars().count() > max_len {
        return Err(format!("{field} is too long"));
    }
    Ok(normalized)
}

fn validate_json_string_array(value: &str, field: &str) -> Result<String, String> {
    let parsed: Vec<String> = serde_json::from_str(value).map_err(|_| format!("{field} must be a JSON string array"))?;
    if parsed.len() > MAX_LIST_ITEMS {
        return Err(format!("{field} has too many items"));
    }

    let mut normalized = Vec::new();
    for item in parsed {
        let text = validate_text_field(&item, MAX_LIST_ITEM_LEN, field)?;
        if !text.is_empty() && !normalized.contains(&text) {
            normalized.push(text);
        }
    }

    serde_json::to_string(&normalized).map_err(|e| e.to_string())
}

fn validate_profile_name(name: &str) -> Result<String, String> {
    let trimmed = validate_text_field(name, MAX_NAME_LEN, "Author profile name")?;
    if trimmed.is_empty() {
        return Err("Author profile name is required".to_string());
    }
    Ok(trimmed)
}

fn validate_create_input(input: CreateAuthorProfileInput) -> Result<CreateAuthorProfileInput, String> {
    Ok(CreateAuthorProfileInput {
        id: validate_profile_id(&input.id)?,
        name: validate_profile_name(&input.name)?,
        preferred_genres: validate_json_string_array(&input.preferred_genres, "preferred_genres")?,
        writing_style: validate_text_field(&input.writing_style, MAX_LONG_TEXT_LEN, "writing_style")?,
        common_phrases: validate_json_string_array(&input.common_phrases, "common_phrases")?,
        favorite_themes: validate_json_string_array(&input.favorite_themes, "favorite_themes")?,
        forbidden_words: validate_json_string_array(&input.forbidden_words, "forbidden_words")?,
        pov_preference: validate_text_field(&input.pov_preference, MAX_SHORT_TEXT_LEN, "pov_preference")?,
        pace_preference: validate_text_field(&input.pace_preference, MAX_SHORT_TEXT_LEN, "pace_preference")?,
        notes: validate_text_field(&input.notes, MAX_LONG_TEXT_LEN, "notes")?,
    })
}

fn validate_optional_list(value: Option<String>, field: &str) -> Result<Option<String>, String> {
    value.map(|next| validate_json_string_array(&next, field)).transpose()
}

fn validate_optional_text(value: Option<String>, max_len: usize, field: &str) -> Result<Option<String>, String> {
    value.map(|next| validate_text_field(&next, max_len, field)).transpose()
}

fn validate_update_input(input: UpdateAuthorProfileInput) -> Result<UpdateAuthorProfileInput, String> {
    Ok(UpdateAuthorProfileInput {
        name: input.name.map(|name| validate_profile_name(&name)).transpose()?,
        preferred_genres: validate_optional_list(input.preferred_genres, "preferred_genres")?,
        writing_style: validate_optional_text(input.writing_style, MAX_LONG_TEXT_LEN, "writing_style")?,
        common_phrases: validate_optional_list(input.common_phrases, "common_phrases")?,
        favorite_themes: validate_optional_list(input.favorite_themes, "favorite_themes")?,
        forbidden_words: validate_optional_list(input.forbidden_words, "forbidden_words")?,
        pov_preference: validate_optional_text(input.pov_preference, MAX_SHORT_TEXT_LEN, "pov_preference")?,
        pace_preference: validate_optional_text(input.pace_preference, MAX_SHORT_TEXT_LEN, "pace_preference")?,
        notes: validate_optional_text(input.notes, MAX_LONG_TEXT_LEN, "notes")?,
    })
}

fn profile_by_id(conn: &Connection, id: &str) -> Result<AuthorProfileRow, String> {
    conn.query_row(
        "SELECT id, name, preferred_genres, writing_style, common_phrases, favorite_themes, forbidden_words, pov_preference, pace_preference, notes, created_at, updated_at
         FROM author_profiles WHERE id = ?1",
        params![id],
        |row| Ok(AuthorProfileRow {
            id: row.get(0)?,
            name: row.get(1)?,
            preferred_genres: row.get(2)?,
            writing_style: row.get(3)?,
            common_phrases: row.get(4)?,
            favorite_themes: row.get(5)?,
            forbidden_words: row.get(6)?,
            pov_preference: row.get(7)?,
            pace_preference: row.get(8)?,
            notes: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        }),
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => "Author profile not found".to_string(),
        _ => "Failed to load author profile".to_string(),
    })
}

fn list_profiles_from_conn(conn: &Connection) -> Result<Vec<AuthorProfileRow>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, name, preferred_genres, writing_style, common_phrases, favorite_themes, forbidden_words, pov_preference, pace_preference, notes, created_at, updated_at
         FROM author_profiles ORDER BY updated_at DESC, created_at DESC, id DESC",
    ).map_err(|_| "Failed to list author profiles".to_string())?;
    let rows = stmt.query_map([], |row| Ok(AuthorProfileRow {
        id: row.get(0)?,
        name: row.get(1)?,
        preferred_genres: row.get(2)?,
        writing_style: row.get(3)?,
        common_phrases: row.get(4)?,
        favorite_themes: row.get(5)?,
        forbidden_words: row.get(6)?,
        pov_preference: row.get(7)?,
        pace_preference: row.get(8)?,
        notes: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })).map_err(|_| "Failed to list author profiles".to_string())?.collect::<Result<Vec<_>, _>>().map_err(|_| "Failed to list author profiles".to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn create_author_profile(state: State<'_, DbConn>, input: CreateAuthorProfileInput) -> Result<AuthorProfileRow, String> {
    let conn = state.0.lock().map_err(|_| "Database lock failed".to_string())?;
    let input = validate_create_input(input)?;
    let now = now_millis();
    conn.execute(
        "INSERT INTO author_profiles (id, name, preferred_genres, writing_style, common_phrases, favorite_themes, forbidden_words, pov_preference, pace_preference, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![input.id, input.name, input.preferred_genres, input.writing_style, input.common_phrases, input.favorite_themes, input.forbidden_words, input.pov_preference, input.pace_preference, input.notes, now, now],
    ).map_err(|_| "Failed to create author profile".to_string())?;
    profile_by_id(&conn, &input.id)
}

#[tauri::command]
pub fn list_author_profiles(state: State<'_, DbConn>) -> Result<Vec<AuthorProfileRow>, String> {
    let conn = state.0.lock().map_err(|_| "Database lock failed".to_string())?;
    list_profiles_from_conn(&conn)
}

#[tauri::command]
pub fn update_author_profile(state: State<'_, DbConn>, id: String, input: UpdateAuthorProfileInput) -> Result<AuthorProfileRow, String> {
    let conn = state.0.lock().map_err(|_| "Database lock failed".to_string())?;
    let id = validate_profile_id(&id)?;
    let input = validate_update_input(input)?;
    let current = profile_by_id(&conn, &id)?;
    let now = now_millis();
    let next_name = input.name.unwrap_or(current.name);
    conn.execute(
        "UPDATE author_profiles SET name = ?1, preferred_genres = ?2, writing_style = ?3, common_phrases = ?4, favorite_themes = ?5, forbidden_words = ?6, pov_preference = ?7, pace_preference = ?8, notes = ?9, updated_at = ?10 WHERE id = ?11",
        params![
            next_name,
            input.preferred_genres.unwrap_or(current.preferred_genres),
            input.writing_style.unwrap_or(current.writing_style),
            input.common_phrases.unwrap_or(current.common_phrases),
            input.favorite_themes.unwrap_or(current.favorite_themes),
            input.forbidden_words.unwrap_or(current.forbidden_words),
            input.pov_preference.unwrap_or(current.pov_preference),
            input.pace_preference.unwrap_or(current.pace_preference),
            input.notes.unwrap_or(current.notes),
            now,
            id,
        ],
    ).map_err(|_| "Failed to update author profile".to_string())?;
    profile_by_id(&conn, &id)
}

#[tauri::command]
pub fn get_default_author_profile(state: State<'_, DbConn>) -> Result<Option<AuthorProfileRow>, String> {
    let conn = state.0.lock().map_err(|_| "Database lock failed".to_string())?;
    Ok(list_profiles_from_conn(&conn)?.into_iter().next())
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
    fn author_profile_migration_is_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        run_author_profile_migration_v4(&conn);
        run_author_profile_migration_v4(&conn);
        assert!(table_exists(&conn, "author_profiles"));
    }

    #[test]
    fn list_profiles_orders_latest_updated_first() {
        let conn = Connection::open_in_memory().unwrap();
        run_author_profile_migration_v4(&conn);
        conn.execute(
            "INSERT INTO author_profiles (id, name, created_at, updated_at) VALUES ('profile-1', '早期', 1, 10)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO author_profiles (id, name, created_at, updated_at) VALUES ('profile-2', '近期', 2, 20)",
            [],
        ).unwrap();

        let profiles = list_profiles_from_conn(&conn).unwrap();
        assert_eq!(profiles[0].id, "profile-2");
    }

    #[test]
    fn invalid_id_is_rejected() {
        assert!(validate_profile_id("profile-1").is_ok());
        assert!(validate_profile_id("../profile").is_err());
    }

    #[test]
    fn list_fields_must_be_bounded_json_string_arrays() {
        assert_eq!(validate_json_string_array("[\"玄幻\",\"玄幻\",\"慢热\"]", "genres").unwrap(), "[\"玄幻\",\"慢热\"]");
        assert!(validate_json_string_array("not-json", "genres").is_err());
        assert!(validate_json_string_array("[1]", "genres").is_err());
        assert!(validate_json_string_array(&format!("[\"{}\"]", "字".repeat(MAX_LIST_ITEM_LEN + 1)), "genres").is_err());
    }
}