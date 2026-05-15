use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use crate::db::DbConn;
use crate::secret::{self, KEYCHAIN_SENTINEL};
use rusqlite::params;

// ==================== Types ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmProviderRow {
    pub id: String,
    pub name: String,
    pub provider_type: String, // 具体类型，如 'openai' | 'anthropic' | 'deepseek' | 'moonshot' | ...（68 种）
    pub api_format: Option<String>, // 协议格式 'openai' | 'anthropic' | 'gemini'，决定如何调用
    pub base_url: String,
    pub api_key: String,
    pub models: String,       // JSON array string
    pub default_model: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateProviderInput {
    pub id: String,
    pub name: String,
    pub provider_type: String,
    pub api_format: Option<String>,
    pub base_url: String,
    pub api_key: String,
    pub models: Vec<String>,
    pub default_model: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProviderInput {
    pub name: Option<String>,
    pub provider_type: Option<String>,
    pub api_format: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub models: Option<Vec<String>>,
    pub default_model: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct CallLlmInput {
    pub provider_id: String,
    pub model: Option<String>,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Serialize, Clone)]
pub struct LlmStreamChunk {
    pub delta: String,
    pub finish_reason: Option<String>,
}

// ==================== DB Init ====================

pub fn init_llm_tables(conn: &rusqlite::Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS llm_providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider_type TEXT NOT NULL,
            api_format TEXT,
            base_url TEXT NOT NULL,
            api_key TEXT NOT NULL,
            models TEXT NOT NULL DEFAULT '[]',
            default_model TEXT,
            created_at INTEGER NOT NULL
        );"
    ).expect("Failed to create llm_providers table");
    // Migration: 已存在的库需补 api_format 列（重复添加会报错，忽略即可）
    let _ = conn.execute("ALTER TABLE llm_providers ADD COLUMN api_format TEXT", []);
}

/// 把具体的 provider_type（68 种之一）解析成 3 种 API 协议格式之一。
/// 优先使用前端传来的 api_format；缺失时按 provider_type 兜底推断；最后默认 openai-compat。
fn resolve_api_format(api_format: Option<&str>, provider_type: &str) -> String {
    if let Some(f) = api_format {
        let trimmed = f.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    match provider_type {
        "anthropic" => "anthropic".to_string(),
        "gemini" => "gemini".to_string(),
        // 其余 66 种（openai / custom / deepseek / moonshot / zhipu / qwen / ...）都默认走 openai 兼容
        _ => "openai".to_string(),
    }
}

// ==================== CRUD Commands ====================

#[tauri::command]
pub fn create_llm_provider(state: State<'_, DbConn>, input: CreateProviderInput) -> Result<LlmProviderRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = now_ms();
    let models_json = serde_json::to_string(&input.models).unwrap_or_else(|_| "[]".to_string());
    let api_format = resolve_api_format(input.api_format.as_deref(), &input.provider_type);

    // API Key 必须进 OS keychain。失败时返回明确错误，绝不静默明文落库（安全底线）。
    secret::store(&input.id, &input.api_key)
        .map_err(|e| format!(
            "无法将 API Key 写入系统凭据存储 ({}). 请确认系统已启用凭据管理服务：Windows 用 Credential Manager / macOS 用 Keychain / Linux 用 gnome-keyring 或 kwallet。",
            e
        ))?;
    let stored_key_in_db = KEYCHAIN_SENTINEL.to_string();

    conn.execute(
        "INSERT INTO llm_providers (id, name, provider_type, api_format, base_url, api_key, models, default_model, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![input.id, input.name, input.provider_type, api_format, input.base_url, stored_key_in_db, models_json, input.default_model, now],
    ).map_err(|e| e.to_string())?;

    // 返回给前端时不暴露哨兵 — 直接返回 plaintext（前端 listProviders 不会重复解密哨兵了）
    Ok(LlmProviderRow {
        id: input.id,
        name: input.name,
        provider_type: input.provider_type,
        api_format: Some(api_format),
        base_url: input.base_url,
        api_key: input.api_key,
        models: models_json,
        default_model: input.default_model,
        created_at: now,
    })
}

#[tauri::command]
pub fn list_llm_providers(state: State<'_, DbConn>) -> Result<Vec<LlmProviderRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, provider_type, api_format, base_url, api_key, models, default_model, created_at FROM llm_providers ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(LlmProviderRow {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                api_format: row.get(3)?,
                base_url: row.get(4)?,
                api_key: row.get(5)?,
                models: row.get(6)?,
                default_model: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 哨兵替换为 keychain 中的 plaintext。失败回退到空串（前端会引导用户重设）。
    let resolved = rows.into_iter().map(|mut r| {
        if r.api_key == KEYCHAIN_SENTINEL {
            r.api_key = secret::load(&r.id).unwrap_or_default();
        }
        r
    }).collect();

    Ok(resolved)
}

#[tauri::command]
pub fn update_llm_provider(state: State<'_, DbConn>, id: String, input: UpdateProviderInput) -> Result<LlmProviderRow, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut sets = vec![];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

    if let Some(ref v) = input.name { sets.push("name = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.provider_type { sets.push("provider_type = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.api_format { sets.push("api_format = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.base_url { sets.push("base_url = ?".to_string()); values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.api_key {
        // API Key 变更必须进 keychain；失败时拒绝写入，绝不静默明文落库。
        secret::store(&id, v)
            .map_err(|e| format!(
                "无法将 API Key 写入系统凭据存储 ({}). 请确认系统已启用凭据管理服务。",
                e
            ))?;
        sets.push("api_key = ?".to_string());
        values.push(Box::new(KEYCHAIN_SENTINEL.to_string()));
    }
    if let Some(ref v) = input.models {
        let json = serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string());
        sets.push("models = ?".to_string()); values.push(Box::new(json));
    }
    if let Some(ref v) = input.default_model { sets.push("default_model = ?".to_string()); values.push(Box::new(v.clone())); }

    if sets.is_empty() {
        return get_provider_by_id(&conn, &id).ok_or_else(|| "Provider not found".to_string());
    }

    let sql = format!("UPDATE llm_providers SET {} WHERE id = ?", sets.join(", "));
    let mut params: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    params.push(&id);

    conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;
    get_provider_by_id(&conn, &id).ok_or_else(|| "Provider not found".to_string())
}

#[tauri::command]
pub fn delete_llm_provider(state: State<'_, DbConn>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM llm_providers WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    // 同步删除 keychain 中的凭据（不存在视为成功）
    let _ = secret::delete(&id);
    Ok(())
}

// ==================== Test Connection ====================

#[tauri::command]
pub async fn test_llm_provider(input: CreateProviderInput) -> Result<String, String> {
    let client = reqwest::Client::new();
    let test_messages = vec![
        serde_json::json!({"role": "user", "content": "Say hello in one word."}),
    ];
    let format = resolve_api_format(input.api_format.as_deref(), &input.provider_type);

    match format.as_str() {
        "anthropic" => {
            let url = format!("{}/v1/messages", input.base_url.trim_end_matches('/'));
            let body = serde_json::json!({
                "model": input.models.first().unwrap_or(&"claude-sonnet-4-20250514".to_string()),
                "messages": test_messages,
                "max_tokens": 10,
            });

            let resp = client.post(&url)
                .header("x-api-key", &input.api_key)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?;

            if resp.status().is_success() {
                let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                let content = v["content"][0]["text"]
                    .as_str().unwrap_or("(no content)");
                Ok(format!("✅ 连接成功: {}", content))
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(format!("❌ HTTP {}: {}", status, text.chars().take(200).collect::<String>()))
            }
        }
        "gemini" => {
            let model = input.models.first().cloned().unwrap_or_else(|| "gemini-1.5-flash".to_string());
            let base = input.base_url.trim_end_matches('/');
            // 用户传的 baseUrl 可能已含 /v1beta；如未含则补上
            let root = if base.contains("/v1beta") || base.contains("/v1") { base.to_string() } else { format!("{}/v1beta", base) };
            let url = format!("{}/models/{}:generateContent", root, model);
            let body = serde_json::json!({
                "contents": [{"parts": [{"text": "Say hello in one word."}]}],
                "generationConfig": {"maxOutputTokens": 10}
            });

            let resp = client.post(&url)
                .header("x-goog-api-key", &input.api_key)
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?;

            if resp.status().is_success() {
                let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                let content = v["candidates"][0]["content"]["parts"][0]["text"]
                    .as_str().unwrap_or("(no content)");
                Ok(format!("✅ 连接成功: {}", content))
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(format!("❌ HTTP {}: {}", status, text.chars().take(200).collect::<String>()))
            }
        }
        // "openai" 及其它任何 openai 兼容的具体厂商类型
        _ => {
            let base = input.base_url.trim_end_matches('/');
            let url = if base.ends_with("/v1") || base.contains("/v1/") {
                format!("{}/chat/completions", base)
            } else {
                format!("{}/v1/chat/completions", base)
            };
            let body = serde_json::json!({
                "model": input.models.first().unwrap_or(&"gpt-4o-mini".to_string()),
                "messages": test_messages,
                "max_tokens": 10,
            });

            let resp = client.post(&url)
                .header("Authorization", format!("Bearer {}", input.api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?;

            if resp.status().is_success() {
                let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                let content = v["choices"][0]["message"]["content"]
                    .as_str().unwrap_or("(no content)");
                Ok(format!("✅ 连接成功: {}", content))
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(format!("❌ HTTP {}: {}", status, text.chars().take(200).collect::<String>()))
            }
        }
    }
}

// ==================== Call LLM (Streaming) ====================

#[tauri::command]
pub async fn call_llm(app: AppHandle, state: State<'_, DbConn>, input: CallLlmInput) -> Result<String, String> {
    eprintln!("[call_llm] provider_id={}, model={:?}", input.provider_id, input.model);
    let mut provider = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        get_provider_by_id(&conn, &input.provider_id)
            .ok_or_else(|| "Provider not found".to_string())?
    };
    // 哨兵 → keychain 实际 plaintext
    if provider.api_key == KEYCHAIN_SENTINEL {
        provider.api_key = secret::load(&provider.id)
            .map_err(|e| format!("无法从 keychain 读取 API Key: {}", e))?;
        if provider.api_key.is_empty() {
            return Err("API Key 不存在或已被清空，请到设置页重新配置".to_string());
        }
    }

    let model = input.model.unwrap_or_else(|| {
        let models: Vec<String> = serde_json::from_str(&provider.models).unwrap_or_default();
        models.first().cloned().unwrap_or_default()
    });

    let messages_json: Vec<serde_json::Value> = input.messages.iter().map(|m| {
        serde_json::json!({"role": m.role, "content": m.content})
    }).collect();

    let client = reqwest::Client::new();
    let mut full_text = String::new();
    let api_format = resolve_api_format(provider.api_format.as_deref(), &provider.provider_type);

    match api_format.as_str() {
        "anthropic" => {
            let url = format!("{}/v1/messages", provider.base_url.trim_end_matches('/'));
            let body = serde_json::json!({
                "model": model,
                "messages": messages_json,
                "max_tokens": input.max_tokens.unwrap_or(2000),
                "temperature": input.temperature.unwrap_or(0.7),
                "stream": true,
            });

            let resp = client.post(&url)
                .header("x-api-key", &provider.api_key)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("LLM 请求失败: {}", e))?;

            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                return Err(format!("LLM HTTP {}: {}", status, text.chars().take(500).collect::<String>()));
            }

            let mut stream = resp.bytes_stream();
            use futures_util::StreamExt;
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|e| e.to_string())?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                while let Some(line_end) = buffer.find('\n') {
                    let line = buffer[..line_end].trim().to_string();
                    buffer = buffer[line_end + 1..].to_string();

                    if let Some(data) = line.strip_prefix("data: ") {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                            if v["type"] == "content_block_delta" {
                                if let Some(text) = v["delta"]["text"].as_str() {
                                    full_text.push_str(text);
                                    let _ = app.emit("llm-stream-chunk", LlmStreamChunk {
                                        delta: text.to_string(),
                                        finish_reason: None,
                                    });
                                }
                            } else if v["type"] == "message_stop" {
                                let _ = app.emit("llm-stream-chunk", LlmStreamChunk {
                                    delta: String::new(),
                                    finish_reason: Some("stop".to_string()),
                                });
                            }
                        }
                    }
                }
            }
        }
        "gemini" => {
            let base = provider.base_url.trim_end_matches('/');
            let root = if base.contains("/v1beta") || base.contains("/v1") { base.to_string() } else { format!("{}/v1beta", base) };
            let url = format!("{}/models/{}:streamGenerateContent?alt=sse", root, model);

            // 转换 OpenAI messages 为 Gemini contents 格式
            let contents: Vec<serde_json::Value> = input.messages.iter().filter_map(|m| {
                if m.role == "system" { return None; } // 系统消息单独处理（systemInstruction）
                let role = if m.role == "assistant" { "model" } else { "user" };
                Some(serde_json::json!({"role": role, "parts": [{"text": m.content}]}))
            }).collect();
            let system_text: String = input.messages.iter()
                .filter(|m| m.role == "system")
                .map(|m| m.content.clone())
                .collect::<Vec<_>>().join("\n");

            let mut body = serde_json::json!({
                "contents": contents,
                "generationConfig": {
                    "maxOutputTokens": input.max_tokens.unwrap_or(2000),
                    "temperature": input.temperature.unwrap_or(0.7),
                }
            });
            if !system_text.is_empty() {
                body["systemInstruction"] = serde_json::json!({"parts": [{"text": system_text}]});
            }

            let resp = client.post(&url)
                .header("x-goog-api-key", &provider.api_key)
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("LLM 请求失败: {}", e))?;

            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                return Err(format!("LLM HTTP {}: {}", status, text.chars().take(500).collect::<String>()));
            }

            let mut stream = resp.bytes_stream();
            use futures_util::StreamExt;
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|e| e.to_string())?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                while let Some(line_end) = buffer.find('\n') {
                    let line = buffer[..line_end].trim().to_string();
                    buffer = buffer[line_end + 1..].to_string();

                    if let Some(data) = line.strip_prefix("data: ") {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(text) = v["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                                full_text.push_str(text);
                                let _ = app.emit("llm-stream-chunk", LlmStreamChunk {
                                    delta: text.to_string(),
                                    finish_reason: None,
                                });
                            }
                            if let Some(reason) = v["candidates"][0]["finishReason"].as_str() {
                                let _ = app.emit("llm-stream-chunk", LlmStreamChunk {
                                    delta: String::new(),
                                    finish_reason: Some(reason.to_string()),
                                });
                            }
                        }
                    }
                }
            }
        }
        // "openai" 兼容（含 deepseek / moonshot / zhipu / qwen 等所有具体类型）
        _ => {
            let base = provider.base_url.trim_end_matches('/');
            let url = if base.ends_with("/v1") || base.contains("/v1/") {
                format!("{}/chat/completions", base)
            } else {
                format!("{}/v1/chat/completions", base)
            };
            let body = serde_json::json!({
                "model": model,
                "messages": messages_json,
                "max_tokens": input.max_tokens.unwrap_or(2000),
                "temperature": input.temperature.unwrap_or(0.7),
                "stream": true,
            });

            let resp = client.post(&url)
                .header("Authorization", format!("Bearer {}", provider.api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("LLM 请求失败: {}", e))?;

            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                return Err(format!("LLM HTTP {}: {}", status, text.chars().take(500).collect::<String>()));
            }

            let mut stream = resp.bytes_stream();
            use futures_util::StreamExt;
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|e| e.to_string())?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                while let Some(line_end) = buffer.find('\n') {
                    let line = buffer[..line_end].trim().to_string();
                    buffer = buffer[line_end + 1..].to_string();

                    if let Some(data) = line.strip_prefix("data: ") {
                        if data == "[DONE]" { break; }

                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(delta) = v["choices"][0]["delta"]["content"].as_str() {
                                full_text.push_str(delta);
                                eprintln!("[call_llm] emitting delta: {:?}", &delta[..delta.len().min(20)]);
                                let _ = app.emit("llm-stream-chunk", LlmStreamChunk {
                                    delta: delta.to_string(),
                                    finish_reason: v["choices"][0]["finish_reason"].as_str().map(|s| s.to_string()),
                                });
                            }
                        }
                    }
                }
            }
            eprintln!("[call_llm] openai/custom stream done, total chars: {}", full_text.len());
        }
    }

    Ok(full_text)
}

// ==================== Fetch Models ====================

#[derive(Debug, Deserialize)]
pub struct FetchModelsInput {
    pub base_url: String,
    pub api_key: String,
    pub provider_type: String,
    pub api_format: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ModelInfo {
    pub id: String,
    pub owned_by: Option<String>,
}

#[tauri::command]
pub async fn fetch_models(input: FetchModelsInput) -> Result<Vec<ModelInfo>, String> {
    let client = reqwest::Client::new();
    let base = input.base_url.trim_end_matches('/');
    let format = resolve_api_format(input.api_format.as_deref(), &input.provider_type);

    match format.as_str() {
        "anthropic" => {
            // 尝试 Anthropic 的 /v1/models（部分代理网关支持，官方暂未公开）
            let url = format!("{}/v1/models", base);
            let resp = client.get(&url)
                .header("x-api-key", &input.api_key)
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?;

            if resp.status().is_success() {
                let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                let models = v["data"].as_array()
                    .map(|arr| {
                        arr.iter().filter_map(|m| {
                            let id = m["id"].as_str()?.to_string();
                            Some(ModelInfo { id, owned_by: Some("anthropic".to_string()) })
                        }).collect::<Vec<_>>()
                    })
                    .unwrap_or_default();
                if !models.is_empty() { return Ok(models); }
                Err("Anthropic /v1/models 返回为空，请手动输入模型名称".to_string())
            } else {
                Err("当前 Anthropic 端点不支持模型列表，请手动输入模型名称".to_string())
            }
        }
        "gemini" => {
            let root = if base.contains("/v1beta") || base.contains("/v1") { base.to_string() } else { format!("{}/v1beta", base) };
            let url = format!("{}/models", root);
            let resp = client.get(&url)
                .header("x-goog-api-key", &input.api_key)
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?;

            if resp.status().is_success() {
                let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                let models = v["models"].as_array()
                    .map(|arr| {
                        arr.iter().filter_map(|m| {
                            // Gemini 返回的 name 形如 "models/gemini-1.5-flash"，剥前缀
                            let raw = m["name"].as_str()?;
                            let id = raw.strip_prefix("models/").unwrap_or(raw).to_string();
                            Some(ModelInfo { id, owned_by: Some("google".to_string()) })
                        }).collect::<Vec<_>>()
                    })
                    .unwrap_or_default();
                Ok(models)
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(format!("HTTP {}: {}", status, text.chars().take(200).collect::<String>()))
            }
        }
        _ => {
            // openai 兼容（覆盖所有具体厂商类型）
            let url = if base.ends_with("/v1") || base.contains("/v1/") {
                format!("{}/models", base)
            } else {
                format!("{}/v1/models", base)
            };

            let resp = client.get(&url)
                .header("Authorization", format!("Bearer {}", input.api_key))
                .send()
                .await
                .map_err(|e| format!("请求失败: {}", e))?;

            if resp.status().is_success() {
                let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
                let models = v["data"].as_array()
                    .map(|arr| {
                        arr.iter().filter_map(|m| {
                            let id = m["id"].as_str()?.to_string();
                            let owned_by = m["owned_by"].as_str().map(|s| s.to_string());
                            Some(ModelInfo { id, owned_by })
                        }).collect::<Vec<_>>()
                    })
                    .unwrap_or_default();
                Ok(models)
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(format!("HTTP {}: {}", status, text.chars().take(200).collect::<String>()))
            }
        }
    }
}

// ==================== Helpers ====================

fn get_provider_by_id(conn: &rusqlite::Connection, id: &str) -> Option<LlmProviderRow> {
    conn.query_row(
        "SELECT id, name, provider_type, api_format, base_url, api_key, models, default_model, created_at FROM llm_providers WHERE id = ?1",
        params![id],
        |row| {
            Ok(LlmProviderRow {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                api_format: row.get(3)?,
                base_url: row.get(4)?,
                api_key: row.get(5)?,
                models: row.get(6)?,
                default_model: row.get(7)?,
                created_at: row.get(8)?,
            })
        },
    ).ok()
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}
