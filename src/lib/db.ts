import Dexie, { type EntityTable } from 'dexie'

// 笔记数据类型
export interface Note {
  id: number
  title: string
  content: string
  tags: string[] // 标签数组
  isFavorite: number // 0 或 1
  isDeleted: number // 0 或 1
  createdAt: Date
  updatedAt: Date
}

// 聊天消息数据类型
export interface ChatMessage {
  id: number
  noteId: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 数据库类
class NoteAppDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  chatMessages!: EntityTable<ChatMessage, 'id'>

  constructor() {
    super('NoteAppDB')

    // 版本 1：初始结构
    this.version(1).stores({
      notes: '++id, title, createdAt, updatedAt',
    })

    // 版本 2：添加 isFavorite 和 isDeleted 字段
    this.version(2)
      .stores({
        notes: '++id, title, isFavorite, isDeleted, createdAt, updatedAt',
      })
      .upgrade((tx) => {
        // 为现有笔记添加默认值
        return tx
          .table('notes')
          .toCollection()
          .modify((note) => {
            note.isFavorite = 0
            note.isDeleted = 0
          })
      })

    // 版本 3：添加 tags 字段（MultiEntry 索引）
    this.version(3)
      .stores({
        notes: '++id, title, *tags, isFavorite, isDeleted, createdAt, updatedAt',
      })
      .upgrade((tx) => {
        return tx
          .table('notes')
          .toCollection()
          .modify((note) => {
            note.tags = []
          })
      })

    // 版本 4：添加 chatMessages 表
    this.version(4).stores({
      notes: '++id, title, *tags, isFavorite, isDeleted, createdAt, updatedAt',
      chatMessages: '++id, noteId, timestamp',
    })
  }
}

// 创建数据库实例
export const db = new NoteAppDB()

// 防止重复初始化的标志
let isInitializing = false

// 初始化默认数据（仅在数据库为空时）
export async function initializeDefaultNotes() {
  // 防止并发调用
  if (isInitializing) return
  isInitializing = true

  try {
    const count = await db.notes.count()
    if (count > 0) return
    const now = new Date()
    await db.notes.bulkAdd([
      {
        title: '欢迎使用 JD Notes',
        content: `欢迎使用 JD Notes！这是一个 Linear 风格的笔记应用。

## 功能特性

- 富文本编辑，支持 Markdown 语法
- 代码块语法高亮，支持运行 Shell 命令
- 自动保存，本地持久化存储
- AI 智能助手（右键菜单 + 侧栏对话）
- 斜杠命令快速调用 AI 模板

开始创建你的第一个笔记吧！`,
        tags: ['入门'],
        isFavorite: 0,
        isDeleted: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        title: '快捷键指南',
        content: `## 编辑器快捷键

- \`Ctrl+B\` - 粗体
- \`Ctrl+I\` - 斜体
- \`Ctrl+Shift+C\` - 代码块

## 通用快捷键

- \`Ctrl+K\` - 搜索笔记
- \`Ctrl+J\` - 打开/关闭 AI 助手侧栏

## AI 功能

**右键菜单**：在编辑器中右键即可呼出 AI 助手菜单
- 选中文本：改进写作、总结摘要、中英互译
- 任意位置：AI 续写、自由提问

**斜杠命令**：输入 \`/\` 触发快捷模板
- AI 续写 - 根据上文继续写作
- 会议纪要 - 生成结构化会议模板
- 脑暴大纲 - 生成 5 点思维大纲
- 代码实现 - 根据描述生成代码

**AI 侧栏**：按 \`Ctrl+J\` 打开，可与 AI 自由对话，AI 会自动获取当前笔记上下文`,
        tags: ['入门', '快捷键'],
        isFavorite: 0,
        isDeleted: 0,
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: new Date(now.getTime() - 86400000),
      },
    ])
  } finally {
    isInitializing = false
  }
}

// 笔记操作函数
export const noteOperations = {
  // 创建新笔记
  async create(title: string = '无标题', content: string = ''): Promise<number> {
    const now = new Date()
    return await db.notes.add({
      title,
      content,
      tags: [],
      isFavorite: 0,
      isDeleted: 0,
      createdAt: now,
      updatedAt: now,
    })
  },

  // 更新笔记
  async update(
    id: number,
    data: Partial<Pick<Note, 'title' | 'content'>>
  ): Promise<void> {
    await db.notes.update(id, {
      ...data,
      updatedAt: new Date(),
    })
  },

  // 切换收藏状态
  async toggleFavorite(id: number): Promise<void> {
    const note = await db.notes.get(id)
    if (note) {
      await db.notes.update(id, {
        isFavorite: note.isFavorite === 1 ? 0 : 1,
        updatedAt: new Date(),
      })
    }
  },

  // 软删除（移到废纸篓）
  async softDelete(id: number): Promise<void> {
    await db.notes.update(id, {
      isDeleted: 1,
      updatedAt: new Date(),
    })
  },

  // 恢复笔记
  async restore(id: number): Promise<void> {
    await db.notes.update(id, {
      isDeleted: 0,
      updatedAt: new Date(),
    })
  },

  // 彻底删除
  async permanentDelete(id: number): Promise<void> {
    await db.notes.delete(id)
  },

  // 获取单个笔记
  async get(id: number): Promise<Note | undefined> {
    return await db.notes.get(id)
  },

  // 更新标签
  async updateTags(id: number, tags: string[]): Promise<void> {
    await db.notes.update(id, {
      tags,
      updatedAt: new Date(),
    })
  },

  // 获取所有唯一标签
  async getAllTags(): Promise<string[]> {
    const notes = await db.notes.where('isDeleted').equals(0).toArray()
    const tagSet = new Set<string>()
    notes.forEach((note) => {
      note.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  },
}

// 聊天消息操作函数
export const chatOperations = {
  // 添加消息
  async add(noteId: number, role: 'user' | 'assistant', content: string): Promise<number> {
    return await db.chatMessages.add({
      noteId,
      role,
      content,
      timestamp: new Date(),
    })
  },

  // 获取笔记的所有消息
  async getByNoteId(noteId: number): Promise<ChatMessage[]> {
    return await db.chatMessages
      .where('noteId')
      .equals(noteId)
      .sortBy('timestamp')
  },

  // 更新消息内容
  async update(id: number, content: string): Promise<void> {
    await db.chatMessages.update(id, { content })
  },

  // 删除单条消息
  async delete(id: number): Promise<void> {
    await db.chatMessages.delete(id)
  },

  // 删除某条消息之后的所有消息
  async deleteAfter(noteId: number, timestamp: Date): Promise<void> {
    await db.chatMessages
      .where('noteId')
      .equals(noteId)
      .filter((msg) => msg.timestamp > timestamp)
      .delete()
  },

  // 清空笔记的所有消息
  async clearByNoteId(noteId: number): Promise<void> {
    await db.chatMessages.where('noteId').equals(noteId).delete()
  },
}
