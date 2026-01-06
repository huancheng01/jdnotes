use serde::{Deserialize, Serialize};

/// 笔记数据模型
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: Option<i64>,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub is_favorite: i32,
    pub is_deleted: i32,
    pub created_at: String,
    pub updated_at: String,
    pub reminder_date: Option<String>,
    pub reminder_enabled: i32,
}

/// 聊天消息数据模型
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub id: Option<i64>,
    pub note_id: i64,
    pub role: String,
    pub content: String,
    pub timestamp: String,
}

/// 笔记过滤器
#[derive(Debug, Serialize, Deserialize)]
pub struct NoteFilter {
    pub search_query: Option<String>,
    pub view: String,  // "inbox" | "favorites" | "trash" | "tag-xxx" | "calendar"
    pub tag: Option<String>,
}

/// 笔记更新数据
#[derive(Debug, Serialize, Deserialize)]
pub struct NoteUpdate {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_favorite: Option<i32>,
    pub is_deleted: Option<i32>,
    pub reminder_date: Option<String>,
    pub reminder_enabled: Option<i32>,
}

/// 数据导出结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub notes: Vec<Note>,
    pub chat_messages: Vec<ChatMessage>,
}

/// 应用配置项（用于存储数据库路径等配置）
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub key: String,
    pub value: String,
}
