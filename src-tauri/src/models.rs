//! 数据模型定义
//!
//! 说明：大部分数据操作在前端通过 tauri-plugin-sql 执行
//! 这里的模型主要用于导入导出功能

use serde::{Deserialize, Serialize};

/// 笔记数据模型（用于导入导出）
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

/// 聊天消息数据模型（用于导入导出）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub id: Option<i64>,
    pub note_id: i64,
    pub role: String,
    pub content: String,
    pub timestamp: String,
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
