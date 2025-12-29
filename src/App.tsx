import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Inbox,
  Star,
  Trash2,
  Search,
  Plus,
  Tag,
  FileText,
  Eye,
  PenLine,
  X,
  RotateCcw,
  Moon,
  Sun,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Editor } from './Editor'
import { db, noteOperations, initializeDefaultNotes, type Note } from './db'
import { useAutoSave } from './useAutoSave'
import { CommandMenu } from './CommandMenu'
import { TagsInput } from './TagsInput'
import { ThemeProvider, useTheme } from './ThemeContext'
import { SettingsModal } from './SettingsModal'
import { AIChatSidebar } from './AIChatSidebar'

// 视图类型
type ViewType = 'inbox' | 'favorites' | 'trash' | `tag-${string}`

// 主题切换按钮组件
function ThemeToggleButton() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
      title={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}

// 侧边栏导航项组件
function SidebarItem({
  icon: Icon,
  label,
  active = false,
  count,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  count?: number
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors duration-200 ${
        active
          ? 'bg-gray-200 dark:bg-dark-card text-gray-900 dark:text-gray-100 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-white/5'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">{count}</span>
      )}
    </button>
  )
}

// 从 HTML 内容提取纯文本预览
function extractPreview(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, 80) + (text.length > 80 ? '...' : '')
}

// 格式化日期
function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

// 笔记卡片组件
function NoteCard({
  note,
  active,
  onClick,
  onDelete,
  onRestore,
  onPermanentDelete,
  isTrashView = false,
}: {
  note: Note
  active: boolean
  onClick: () => void
  onDelete: () => void
  onRestore?: () => void
  onPermanentDelete?: () => void
  isTrashView?: boolean
}) {
  const preview = extractPreview(note.content)

  return (
    <div
      className={`group relative w-full text-left px-3 py-3 border-b border-gray-100 dark:border-white/10 transition-colors duration-200 cursor-pointer ${
        active ? 'bg-gray-100 dark:bg-dark-card' : 'hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 pr-12">
        {note.isFavorite === 1 && (
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate flex-shrink min-w-0">
          {note.title || '无标题'}
        </h3>
        {note.tags && note.tags.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1 max-w-[120px] overflow-hidden">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 text-[10px] rounded whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
      <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
        {preview || '空笔记'}
      </p>
      <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 block">
        {formatDate(note.updatedAt)}
      </span>

      {/* 操作按钮 */}
      <div className="absolute top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        {isTrashView ? (
          <>
            {/* 恢复按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRestore?.()
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10"
              title="恢复笔记"
            >
              <RotateCcw className="h-3.5 w-3.5 text-gray-400 hover:text-green-500" />
            </button>
            {/* 彻底删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPermanentDelete?.()
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10"
              title="彻底删除"
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
            </button>
          </>
        ) : (
          /* 删除按钮 */
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10"
            title="删除笔记"
          >
            <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
          </button>
        )}
      </div>
    </div>
  )
}

// 空状态组件
function EmptyState({ onCreateNote }: { onCreateNote: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
      <FileText className="h-16 w-16 mb-4 stroke-1" />
      <p className="text-[14px]">选择一个笔记开始编辑</p>
      <p className="text-[12px] mt-1">或者创建一个新笔记</p>
      <button
        onClick={onCreateNote}
        className="mt-4 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
      >
        创建笔记
      </button>
    </div>
  )
}

// 无笔记状态
function NoNotesState({ onCreateNote }: { onCreateNote: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
      <FileText className="h-12 w-12 mb-3 stroke-1" />
      <p className="text-[13px]">暂无笔记</p>
      <button
        onClick={onCreateNote}
        className="mt-3 px-3 py-1.5 bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-300 text-[12px] rounded-md hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
      >
        创建第一个笔记
      </button>
    </div>
  )
}

function App() {
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false) // 默认阅读模式
  const [searchQuery, setSearchQuery] = useState('')
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [currentView, setCurrentView] = useState<ViewType>('inbox')
  const [showSettings, setShowSettings] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [contentToInsert, setContentToInsert] = useState<string | null>(null)

  // 追踪已知存在的笔记 ID（用于区分新建和删除）
  const knownNoteIdsRef = useRef<Set<number>>(new Set())

  // 切换 AI 聊天侧栏
  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev)
  }, [])

  // Cmd/Ctrl + J 快捷键切换侧栏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        toggleChat()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleChat])

  // 初始化默认数据
  useEffect(() => {
    initializeDefaultNotes()
  }, [])

  // 从 IndexedDB 获取笔记列表（按更新时间倒序）
  const allNotes = useLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
    []
  )

  // 获取所有唯一标签
  const allTags = useMemo(() => {
    if (!allNotes) return []
    const tagSet = new Set<string>()
    allNotes
      .filter((n) => n.isDeleted === 0)
      .forEach((note) => {
        note.tags?.forEach((tag) => tagSet.add(tag))
      })
    return Array.from(tagSet).sort()
  }, [allNotes])

  // 根据视图过滤笔记
  const filteredNotes = useMemo(() => {
    if (!allNotes) return []

    // 检查是否是标签视图
    if (currentView.startsWith('tag-')) {
      const selectedTag = currentView.slice(4) // 移除 'tag-' 前缀
      return allNotes.filter(
        (note) => note.isDeleted === 0 && note.tags?.includes(selectedTag)
      )
    }

    switch (currentView) {
      case 'inbox':
        return allNotes.filter((note) => note.isDeleted === 0)
      case 'favorites':
        return allNotes.filter(
          (note) => note.isFavorite === 1 && note.isDeleted === 0
        )
      case 'trash':
        return allNotes.filter((note) => note.isDeleted === 1)
      default:
        return allNotes
    }
  }, [allNotes, currentView])

  // 搜索过滤（包括标题、内容和标签）
  const notes = useMemo(() => {
    if (!filteredNotes) return []
    if (!searchQuery.trim()) return filteredNotes

    const query = searchQuery.toLowerCase()
    return filteredNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  }, [filteredNotes, searchQuery])

  // 统计数量
  const counts = useMemo(() => {
    if (!allNotes) return { inbox: 0, favorites: 0, trash: 0 }
    return {
      inbox: allNotes.filter((n) => n.isDeleted === 0).length,
      favorites: allNotes.filter((n) => n.isFavorite === 1 && n.isDeleted === 0)
        .length,
      trash: allNotes.filter((n) => n.isDeleted === 1).length,
    }
  }, [allNotes])

  // 当前选中的笔记
  const activeNote = useMemo(() => {
    if (!notes || activeNoteId === null) return null
    return notes.find((note) => note.id === activeNoteId) || null
  }, [notes, activeNoteId])

  // 选择笔记 - 切换笔记时默认进入阅读模式
  const handleSelectNote = (note: Note) => {
    setActiveNoteId(note.id)
    setLocalTitle(note.title)
    setLocalContent(note.content)
    setIsEditing(false) // 切换笔记时默认进入阅读模式
  }

  // 更新已知笔记 ID 集合，并处理删除场景
  useEffect(() => {
    if (!notes) return

    const currentIds = new Set(notes.map((n) => n.id))

    // 只有当笔记之前存在于列表中、现在不存在时才清除（真正的删除）
    if (
      activeNoteId !== null &&
      knownNoteIdsRef.current.has(activeNoteId) &&
      !currentIds.has(activeNoteId)
    ) {
      setActiveNoteId(null)
    }

    // 更新已知 ID 集合
    knownNoteIdsRef.current = currentIds
  }, [notes, activeNoteId])

  // 自动保存
  useAutoSave({
    noteId: activeNoteId,
    title: localTitle,
    content: localContent,
    delay: 500,
  })

  // 空笔记自动进入编辑模式（作为安全网，确保新笔记进入编辑模式）
  useEffect(() => {
    if (activeNote === null) return

    // 检查是否是新建的空笔记
    const isEmptyNote = activeNote.title === '无标题' && activeNote.content === ''
    if (isEmptyNote) {
      setIsEditing(true)
    }
  }, [activeNote?.id]) // 仅在笔记 ID 变化时触发

  // 创建新笔记
  const handleCreateNote = async () => {
    try {
      const id = await noteOperations.create()
      console.log('Created Note ID:', id, typeof id)
      // 确保 ID 是数字类型
      setActiveNoteId(Number(id))
      setLocalTitle('无标题')
      setLocalContent('')
      setIsEditing(true)
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  // 软删除笔记（移到废纸篓）
  const handleDeleteNote = async (id: number) => {
    await noteOperations.softDelete(id)
    if (activeNoteId === id) {
      setActiveNoteId(null)
    }
  }

  // 切换收藏状态
  const handleToggleFavorite = async (id: number) => {
    await noteOperations.toggleFavorite(id)
  }

  // 恢复笔记
  const handleRestoreNote = async (id: number) => {
    await noteOperations.restore(id)
  }

  // 彻底删除笔记
  const handlePermanentDelete = async (id: number) => {
    await noteOperations.permanentDelete(id)
    if (activeNoteId === id) {
      setActiveNoteId(null)
    }
  }

  // 更新本地标题
  const handleTitleChange = (title: string) => {
    setLocalTitle(title)
  }

  // 更新本地内容
  const handleContentChange = (content: string) => {
    setLocalContent(content)
  }

  // 更新标签
  const handleTagsChange = async (tags: string[]) => {
    if (activeNoteId) {
      await noteOperations.updateTags(activeNoteId, tags)
    }
  }

  // 插入内容到笔记
  const handleInsertToNote = useCallback((content: string) => {
    setContentToInsert(content)
    // 切换到编辑模式以便插入内容
    setIsEditing(true)
  }, [])

  // 插入完成后清除状态
  const handleContentInserted = useCallback(() => {
    setContentToInsert(null)
  }, [])

  // 从命令面板选择笔记
  const handleCommandSelectNote = (id: number) => {
    const note = notes.find((n) => n.id === id)
    if (note) {
      handleSelectNote(note)
    }
  }

  return (
    <>
      {/* 全局命令面板 */}
      <CommandMenu
        notes={notes}
        onSelectNote={handleCommandSelectNote}
        onCreateNote={handleCreateNote}
      />

      {/* 设置模态框 */}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />

      <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-dark-bg transition-colors duration-300">
      {/* 左侧边栏 */}
      <aside className="w-[260px] bg-gray-50 dark:bg-dark-sidebar border-r border-gray-200 dark:border-white/10 flex flex-col transition-colors duration-300">
        {/* Logo 和主题切换 */}
        <div className="p-3 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gray-900 dark:bg-gray-100 flex items-center justify-center">
                <span className="text-white dark:text-gray-900 text-[11px] font-semibold">J</span>
              </div>
              <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                JD Notes
              </span>
            </div>
            <ThemeToggleButton />
          </div>
        </div>

        {/* 搜索输入框 */}
        <div className="p-3">
          <div className="flex items-center gap-2 w-full px-3 py-2 bg-white dark:bg-dark-input border border-gray-200 dark:border-gray-700 rounded-md shadow-sm text-[13px] text-gray-500 dark:text-gray-400 focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-colors duration-200">
            <Search className="h-4 w-4 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索笔记..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* 导航链接 */}
        <nav className="px-3 space-y-1">
          <SidebarItem
            icon={Inbox}
            label="收件箱"
            active={currentView === 'inbox'}
            count={counts.inbox}
            onClick={() => setCurrentView('inbox')}
          />
          <SidebarItem
            icon={Star}
            label="收藏"
            active={currentView === 'favorites'}
            count={counts.favorites}
            onClick={() => setCurrentView('favorites')}
          />
          <SidebarItem
            icon={Trash2}
            label="废纸篓"
            active={currentView === 'trash'}
            count={counts.trash}
            onClick={() => setCurrentView('trash')}
          />
        </nav>

        {/* 标签区域 */}
        <div className="mt-6 px-3 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              标签
            </span>
          </div>
          <div className="space-y-1">
            {allTags.length === 0 ? (
              <p className="text-[12px] text-gray-400 dark:text-gray-500 px-3 py-2">暂无标签</p>
            ) : (
              allTags.map((tag) => {
                const tagCount =
                  allNotes?.filter(
                    (n) => n.isDeleted === 0 && n.tags?.includes(tag)
                  ).length || 0
                const isActive = currentView === `tag-${tag}`
                return (
                  <button
                    key={tag}
                    onClick={() => setCurrentView(`tag-${tag}`)}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-[13px] transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-200 dark:bg-dark-card text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-white/5'
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>{tag}</span>
                    <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
                      {tagCount}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 设置按钮 - 底部 */}
        <div className="p-3 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 w-full px-3 py-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-white/5 rounded-md transition-colors duration-200"
          >
            <Settings className="h-4 w-4" />
            <span>设置</span>
          </button>
        </div>
      </aside>

      {/* 中间笔记列表 */}
      <div className="w-[320px] bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-white/10 flex flex-col transition-colors duration-300">
        {/* 列表头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            {searchQuery
              ? `搜索: "${searchQuery}"`
              : currentView === 'inbox'
                ? '收件箱'
                : currentView === 'favorites'
                  ? '收藏'
                  : currentView === 'trash'
                    ? '废纸篓'
                    : currentView.startsWith('tag-')
                      ? `标签: ${currentView.slice(4)}`
                      : '收件箱'}
          </h2>
          {currentView !== 'trash' && (
            <button
              onClick={handleCreateNote}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-200"
              title="新建笔记"
            >
              <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* 笔记列表 */}
        <div className="flex-1 overflow-y-auto">
          {!notes || notes.length === 0 ? (
            <NoNotesState onCreateNote={handleCreateNote} />
          ) : (
            notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                active={note.id === activeNoteId}
                onClick={() => handleSelectNote(note)}
                onDelete={() => handleDeleteNote(note.id)}
                onRestore={() => handleRestoreNote(note.id)}
                onPermanentDelete={() => handlePermanentDelete(note.id)}
                isTrashView={currentView === 'trash'}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧编辑器 + AI 侧栏 */}
      <div className="flex-1 flex h-full overflow-hidden">
      <main className="flex-1 bg-white dark:bg-dark-bg h-full overflow-hidden flex flex-col transition-colors duration-300">
        {activeNoteId !== null ? (
          <>
            {/* 编辑器头部 */}
            <div className="flex items-center justify-between px-12 py-4 border-b border-gray-100 dark:border-white/10">
              <nav className="text-[13px] text-gray-500 dark:text-gray-400">
                <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                  收件箱
                </span>
                <span className="mx-2">/</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {localTitle || '无标题'}
                </span>
              </nav>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-400 dark:text-gray-500">
                  最后编辑于 {formatDate(activeNote?.updatedAt ?? new Date())}
                </span>
                {/* 收藏按钮 */}
                <button
                  onClick={() => activeNoteId && handleToggleFavorite(activeNoteId)}
                  className={`p-1.5 rounded-md transition-colors duration-200 ${
                    activeNote?.isFavorite === 1
                      ? 'text-yellow-500 hover:bg-gray-100 dark:hover:bg-white/10'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                  title={activeNote?.isFavorite === 1 ? '取消收藏' : '收藏'}
                >
                  <Star
                    className={`h-4 w-4 ${activeNote?.isFavorite === 1 ? 'fill-yellow-500' : ''}`}
                  />
                </button>
                {/* 模式切换按钮 */}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-200"
                  title={isEditing ? '切换到阅读模式' : '切换到编辑模式'}
                >
                  {isEditing ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <PenLine className="h-4 w-4" />
                  )}
                </button>
                {/* AI 助手按钮 */}
                <button
                  onClick={toggleChat}
                  className={`p-1.5 rounded-md transition-colors duration-200 ${
                    isChatOpen
                      ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                  title="AI 助手 (⌘J)"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 标签输入区域 */}
            <div className="px-12 py-2 border-b border-gray-100 dark:border-white/10">
              <TagsInput
                tags={activeNote?.tags ?? []}
                onChange={handleTagsChange}
                disabled={!isEditing}
              />
            </div>

            {/* Tiptap 编辑器 */}
            <Editor
              key={`editor-${activeNoteId}`}
              title={localTitle}
              content={localContent}
              tags={activeNote?.tags ?? []}
              isEditing={isEditing}
              createdAt={activeNote?.createdAt ?? new Date()}
              updatedAt={activeNote?.updatedAt ?? new Date()}
              onTitleChange={handleTitleChange}
              onContentChange={handleContentChange}
              onTagsChange={handleTagsChange}
              contentToInsert={contentToInsert}
              onContentInserted={handleContentInserted}
            />
          </>
        ) : (
          <EmptyState onCreateNote={handleCreateNote} />
        )}
      </main>

      {/* AI 聊天侧栏 */}
      <AIChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        noteId={activeNoteId}
        noteTitle={localTitle}
        noteContent={localContent}
        onInsertToNote={handleInsertToNote}
      />
      </div>
      </div>
    </>
  )
}

function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

export default AppWithTheme
