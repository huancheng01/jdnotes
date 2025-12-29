import { useState, useRef, useEffect } from 'react'
import { Copy, Pencil, Trash2, RotateCcw, Check, FileInput } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from './db'

interface ChatMessageItemProps {
  message: ChatMessage
  isStreaming?: boolean
  isTemporary?: boolean
  isAnyStreaming?: boolean // 是否有任何消息正在流式传输
  onCopy: (content: string) => void
  onEdit: (id: number, newContent: string) => void
  onDelete: (id: number) => void
  onRetry: (message: ChatMessage) => void
  onInsertToNote?: (content: string) => void // 插入到笔记
}

export function ChatMessageItem({
  message,
  isStreaming,
  isTemporary,
  isAnyStreaming,
  onCopy,
  onEdit,
  onDelete,
  onRetry,
  onInsertToNote,
}: ChatMessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整编辑框高度、聚焦并全选
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
      textarea.focus()
      textarea.select() // 全选文本
    }
  }, [isEditing])

  // 编辑内容变化时调整高度
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [editContent, isEditing])

  // 复制内容
  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const isUser = message.role === 'user'

  return (
    <div className={`group py-3 border-b border-black/[0.03] dark:border-white/[0.06] last:border-b-0 ${
      !isUser ? 'ai-message-float px-3 py-3 my-1 -mx-1' : ''
    }`}>
      {/* 角色标签 */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[11px] font-medium ${
          isUser
            ? 'text-[#5E6AD2]'
            : 'text-slate-500 dark:text-slate-400'
        }`}>
          {isUser ? '你' : 'AI'}
        </span>

        {/* 操作按钮 - 悬停显示 */}
        {!isEditing && !isStreaming && !isTemporary && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 复制 */}
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
              title="复制"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" strokeWidth={1.5} />
              )}
            </button>

            {/* 编辑（仅用户消息，流式传输时禁用） */}
            {isUser && (
              <button
                onClick={() => setIsEditing(true)}
                disabled={isAnyStreaming}
                className={`p-1 rounded-md ${
                  isAnyStreaming
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                }`}
                title={isAnyStreaming ? '等待 AI 响应完成' : '编辑'}
              >
                <Pencil className="h-3 w-3" strokeWidth={1.5} />
              </button>
            )}

            {/* 重试（仅 AI 消息） */}
            {!isUser && (
              <button
                onClick={() => onRetry(message)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                title="重新生成"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
              </button>
            )}

            {/* 插入到笔记（仅 AI 消息） */}
            {!isUser && onInsertToNote && (
              <button
                onClick={() => onInsertToNote(message.content)}
                className="p-1 rounded-md text-slate-400 hover:text-[#5E6AD2] hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                title="插入到笔记"
              >
                <FileInput className="h-3 w-3" strokeWidth={1.5} />
              </button>
            )}

            {/* 删除 */}
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
              title="删除"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* 消息内容 */}
      {isEditing ? (
        <div className="flex flex-col gap-2 edit-message-container">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-white/80 dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 text-[13px] resize-none outline-none focus:border-[#5E6AD2]/50 focus:ring-1 focus:ring-[#5E6AD2]/30 transition-all"
            rows={1}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Enter 发送 · Shift+Enter 换行 · Esc 取消
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 text-[11px] rounded-md text-slate-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-2 py-1 text-[11px] rounded-md bg-[#5E6AD2] text-white hover:bg-[#4F5ABF]"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-[13px] leading-relaxed ${
          isUser
            ? 'text-[#5E6AD2]'
            : 'text-slate-700 dark:text-slate-300'
        }`}>
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <div className="ai-chat-message prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || ' '}
              </ReactMarkdown>
              {isStreaming && <span className="ai-streaming-cursor" />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
