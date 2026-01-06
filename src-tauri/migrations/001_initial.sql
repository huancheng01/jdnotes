-- 笔记表
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',  -- JSON 数组
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,  -- ISO 8601 格式
    updated_at TEXT NOT NULL,
    reminder_date TEXT,  -- ISO 8601 格式，可为 NULL
    reminder_enabled INTEGER NOT NULL DEFAULT 0
);

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,  -- ISO 8601 格式
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_is_deleted ON notes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes(reminder_enabled, reminder_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_note_id ON chat_messages(note_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- 应用配置表（存储数据库路径等）
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
