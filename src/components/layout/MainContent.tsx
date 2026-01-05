import { Star, Eye, PenLine, Sparkles } from 'lucide-react'
import { Editor } from '../editor'
import { TagsInput, EmptyState } from '../common'
import { formatDate } from '../../lib/utils'
import type { Note } from '../../lib/db'

interface MainContentProps {
  activeNoteId: number | null
  activeNote: Note | null
  localTitle: string
  localContent: string
  isEditing: boolean
  isChatOpen: boolean
  contentToInsert: string | null
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onTagsChange: (tags: string[]) => void
  onToggleFavorite: (id: number) => void
  onToggleEdit: () => void
  onToggleChat: () => void
  onCreateNote: () => void
  onContentInserted: () => void
}

export function MainContent({
  activeNoteId,
  activeNote,
  localTitle,
  localContent,
  isEditing,
  isChatOpen,
  contentToInsert,
  onTitleChange,
  onContentChange,
  onTagsChange,
  onToggleFavorite,
  onToggleEdit,
  onToggleChat,
  onCreateNote,
  onContentInserted,
}: MainContentProps) {
  return (
    <main className="flex-1 bg-[#F9FBFC] dark:bg-[#0B0D11] h-full overflow-hidden flex flex-col transition-colors duration-300">
      {activeNoteId !== null ? (
        <>
          {/* 编辑器头部 - 毛玻璃效果 */}
          <div className="flex items-center justify-between px-12 py-4 border-b border-black/[0.03] dark:border-white/[0.06] editor-header-glass sticky top-0 z-10">
            <nav className="text-[13px] text-slate-400">
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors">
                收件箱
              </span>
              <span className="mx-2">/</span>
              <span className="text-slate-900 dark:text-slate-100">
                {localTitle || '无标题'}
              </span>
            </nav>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-400">
                最后编辑于 {formatDate(activeNote?.updatedAt ?? new Date())}
              </span>
              {/* 收藏按钮 */}
              <button
                onClick={() => activeNoteId && onToggleFavorite(activeNoteId)}
                className={`p-1.5 rounded-lg transition-colors duration-200 btn-press ${
                  activeNote?.isFavorite === 1
                    ? 'text-[#5E6AD2] hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                    : 'text-slate-400 hover:text-[#5E6AD2] hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                }`}
                title={activeNote?.isFavorite === 1 ? '取消收藏' : '收藏'}
              >
                <Star
                  className={`h-4 w-4 ${activeNote?.isFavorite === 1 ? 'fill-[#5E6AD2]' : ''}`}
                  strokeWidth={1.5}
                />
              </button>
              {/* 模式切换按钮 */}
              <button
                onClick={onToggleEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors duration-200 btn-press"
                title={isEditing ? '切换到阅读模式' : '切换到编辑模式'}
              >
                {isEditing ? (
                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <PenLine className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
              {/* AI 助手按钮 */}
              <button
                onClick={onToggleChat}
                className={`p-1.5 rounded-lg transition-colors duration-200 btn-press ${
                  isChatOpen
                    ? 'text-[#5E6AD2] bg-[#5E6AD2]/10'
                    : 'text-slate-400 hover:text-[#5E6AD2] hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                }`}
                title="AI 助手 (⌘J)"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* 标签输入区域 */}
          <div className="px-12 py-2 border-b border-black/[0.03] dark:border-white/[0.06]">
            <TagsInput
              tags={activeNote?.tags ?? []}
              onChange={onTagsChange}
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
            onTitleChange={onTitleChange}
            onContentChange={onContentChange}
            onTagsChange={onTagsChange}
            contentToInsert={contentToInsert}
            onContentInserted={onContentInserted}
          />
        </>
      ) : (
        <EmptyState onCreateNote={onCreateNote} />
      )}
    </main>
  )
}
