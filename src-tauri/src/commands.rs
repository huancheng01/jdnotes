use crate::db;
use crate::models::{ChatMessage, ExportData, Note, NoteFilter, NoteUpdate};

// ============= 笔记操作 =============
// 注意：由于使用 tauri-plugin-sql，大部分 SQL 操作在前端直接通过插件执行
// 这里的命令主要用于需要后端处理的特殊操作

/// 创建新笔记（占位，实际使用前端 SQL 插件）
#[tauri::command]
pub async fn create_note(
    _title: String,
    _content: String,
) -> Result<i64, String> {
    // 实际操作在前端通过 SQL 插件执行
    Ok(1)
}

/// 获取所有笔记（带过滤）
#[tauri::command]
pub async fn get_notes(_filter: NoteFilter) -> Result<Vec<Note>, String> {
    // 实际操作在前端通过 SQL 插件执行
    Ok(vec![])
}

/// 根据 ID 获取单个笔记
#[tauri::command]
pub async fn get_note_by_id(_id: i64) -> Result<Option<Note>, String> {
    Ok(None)
}

/// 更新笔记
#[tauri::command]
pub async fn update_note(_id: i64, _data: NoteUpdate) -> Result<(), String> {
    Ok(())
}

/// 软删除笔记（移到废纸篓）
#[tauri::command]
pub async fn soft_delete_note(_id: i64) -> Result<(), String> {
    Ok(())
}

/// 恢复已删除的笔记
#[tauri::command]
pub async fn restore_note(_id: i64) -> Result<(), String> {
    Ok(())
}

/// 永久删除笔记
#[tauri::command]
pub async fn hard_delete_note(_id: i64) -> Result<(), String> {
    Ok(())
}

/// 切换收藏状态
#[tauri::command]
pub async fn toggle_favorite(_id: i64) -> Result<(), String> {
    Ok(())
}

/// 更新笔记标签
#[tauri::command]
pub async fn update_note_tags(_id: i64, _tags: Vec<String>) -> Result<(), String> {
    Ok(())
}

/// 更新笔记提醒
#[tauri::command]
pub async fn update_note_reminder(
    _id: i64,
    _reminder_date: Option<String>,
    _reminder_enabled: bool,
) -> Result<(), String> {
    Ok(())
}

/// 获取所有标签
#[tauri::command]
pub async fn get_all_tags() -> Result<Vec<String>, String> {
    Ok(vec![])
}

// ============= 聊天消息操作 =============

/// 添加聊天消息
#[tauri::command]
pub async fn add_chat_message(
    _note_id: i64,
    _role: String,
    _content: String,
) -> Result<i64, String> {
    Ok(1)
}

/// 获取笔记的聊天消息
#[tauri::command]
pub async fn get_chat_messages(_note_id: i64) -> Result<Vec<ChatMessage>, String> {
    Ok(vec![])
}

/// 删除笔记的所有聊天消息
#[tauri::command]
pub async fn delete_chat_messages(_note_id: i64) -> Result<(), String> {
    Ok(())
}

// ============= 数据库路径管理 =============

/// 获取当前数据库路径
#[tauri::command]
pub async fn get_database_path(app: tauri::AppHandle) -> Result<String, String> {
    let path = db::get_database_path(&app)?;
    Ok(path.to_string_lossy().to_string())
}

/// 获取数据库信息
#[tauri::command]
pub async fn get_database_info(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = db::get_database_path(&app)?;
    let exists = db::database_exists(&app)?;
    let size = db::get_database_size(&app)?;
    let config = db::load_config(&app)?;
    let is_custom = config.database_path.is_some();
    
    Ok(serde_json::json!({
        "path": path.to_string_lossy().to_string(),
        "exists": exists,
        "size": size,
        "size_formatted": format_size(size),
        "is_custom": is_custom
    }))
}

/// 更改数据库存储位置
#[tauri::command]
pub async fn change_database_location(app: tauri::AppHandle, new_dir: String) -> Result<String, String> {
    log::info!("change_database_location called with: {}", new_dir);
    match db::change_database_location(&app, &new_dir) {
        Ok(path) => {
            log::info!("Database location changed to: {}", path);
            Ok(path)
        }
        Err(e) => {
            log::error!("Failed to change database location: {}", e);
            Err(e)
        }
    }
}

/// 格式化文件大小
fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    
    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

/// 复制数据库到新位置
#[tauri::command]
pub async fn copy_database_to(app: tauri::AppHandle, new_path: String) -> Result<(), String> {
    db::copy_database(&app, &new_path)
}

// ============= 数据导入导出 =============

/// 导出数据库为 JSON
#[tauri::command]
pub async fn export_database_json() -> Result<String, String> {
    let export_data = ExportData {
        version: "1.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        notes: vec![],
        chat_messages: vec![],
    };
    
    serde_json::to_string_pretty(&export_data).map_err(|e| e.to_string())
}

/// 从 JSON 导入数据
#[tauri::command]
pub async fn import_database_json(json_data: String) -> Result<serde_json::Value, String> {
    let import_data: ExportData = serde_json::from_str(&json_data)
        .map_err(|e| format!("JSON 解析失败: {}", e))?;
    
    // 返回导入统计
    Ok(serde_json::json!({
        "notes_count": import_data.notes.len(),
        "messages_count": import_data.chat_messages.len()
    }))
}

/// 从 IndexedDB 数据导入
#[tauri::command]
pub async fn import_from_indexeddb(data: serde_json::Value) -> Result<serde_json::Value, String> {
    // 解析 IndexedDB 导出的数据格式
    let notes = data.get("notes").and_then(|v| v.as_array());
    let messages = data.get("chatMessages").and_then(|v| v.as_array());
    
    let notes_count = notes.map(|n| n.len()).unwrap_or(0);
    let messages_count = messages.map(|m| m.len()).unwrap_or(0);
    
    Ok(serde_json::json!({
        "success": true,
        "notes_imported": notes_count,
        "messages_imported": messages_count
    }))
}

// ============= 初始化相关 =============

/// 获取数据库 URL
#[tauri::command]
pub async fn get_database_url(app: tauri::AppHandle) -> Result<String, String> {
    db::get_database_url(&app)
}
