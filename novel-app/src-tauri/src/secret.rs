//! OS keychain 集成，用于安全存储 LLM API Key 等敏感凭据。
//!
//! 平台后端：
//! - Windows → Windows Credential Manager（DPAPI 加密）
//! - macOS → Keychain
//! - Linux → Secret Service（gnome-keyring / kwallet）
//!
//! DB 中 `llm_providers.api_key` 用 `<keychain>` 哨兵值表示「实际在 keychain 中」。
//! 真实的 plaintext 通过本模块按 provider id 存取。

use keyring::Entry;

const SERVICE_NAME: &str = "NovelCraft";

/// DB `api_key` 列的哨兵值。Rust list_llm_providers 会把哨兵原样返回，
/// 前端识别后调用 get_provider_secret 取回 plaintext。
pub const KEYCHAIN_SENTINEL: &str = "<keychain>";

/// 向 OS keychain 写入一条凭据。
/// 失败时返回错误字符串（前端可决定是否回落到 AES-GCM 备用方案）。
pub fn store(id: &str, secret: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, id).map_err(|e| format!("keychain entry 创建失败: {}", e))?;
    entry.set_password(secret).map_err(|e| format!("keychain 写入失败: {}", e))
}

/// 从 OS keychain 读取一条凭据。
/// 不存在时返回空字符串而非错误（便于前端处理"未配置"场景）。
pub fn load(id: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, id).map_err(|e| format!("keychain entry 创建失败: {}", e))?;
    match entry.get_password() {
        Ok(s) => Ok(s),
        Err(keyring::Error::NoEntry) => Ok(String::new()),
        Err(e) => Err(format!("keychain 读取失败: {}", e)),
    }
}

/// 删除 keychain 中的凭据，不存在视为成功（幂等）。
pub fn delete(id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, id).map_err(|e| format!("keychain entry 创建失败: {}", e))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("keychain 删除失败: {}", e)),
    }
}

// ==================== Tauri Commands ====================

#[tauri::command]
pub fn set_provider_secret(id: String, api_key: String) -> Result<(), String> {
    store(&id, &api_key)
}

#[tauri::command]
pub fn get_provider_secret(id: String) -> Result<String, String> {
    load(&id)
}

#[tauri::command]
pub fn delete_provider_secret(id: String) -> Result<(), String> {
    delete(&id)
}
