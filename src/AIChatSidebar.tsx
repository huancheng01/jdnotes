import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Sparkles, Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAIStream } from './useAIStream'
import { db, chatOperations, type ChatMessage } from './db'
import { ChatMessageItem } from './ChatMessageItem'

// 临时流式消息类型
interface StreamingMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  noteId: number | null
  noteTitle: string
  noteContent: string
  onInsertToNote?: (content: string) => void
}

export function AIChatSidebar({ isOpen, onClose, noteId, noteTitle, noteContent, onInsertToNote }: AIChatSidebarProps) {
  const [input, setInput] = useState('')
  // 流式期间的临时消息（不写入数据库）
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreamingActive, setIsStreamingActive] = useState(false)
  // 是否是重试模式（重试时不保存用户消息）
  const [isRetryMode, setIsRetryMode] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamTextRef = useRef('')
  const pendingUserMessageRef = useRef<string | null>(null)
  const noteIdRef = useRef<number | null>(null)
  const isRetryModeRef = useRef(false)

  // 同步 refs
  useEffect(() => {
    pendingUserMessageRef.current = pendingUserMessage
    noteIdRef.current = noteId
    isRetryModeRef.current = isRetryMode
  }, [pendingUserMessage, noteId, isRetryMode])

  // 从数据库获取消息
  const messages = useLiveQuery(
    () => (noteId ? db.chatMessages.where('noteId').equals(noteId).sortBy('timestamp') : []),
    [noteId],
    []
  )

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // 构建上下文提示
  const buildContextPrompt = useCallback(() => {
    return `你是 JD Notes 的 AI 助手。

当前笔记上下文：
- 标题：${noteTitle || '无标题'}
- 内容：${noteContent.slice(0, 2000)}${noteContent.length > 2000 ? '...(内容已截断)' : ''}

请根据用户的问题提供帮助。如果问题与笔记内容相关，请结合笔记上下文作答。`
  }, [noteTitle, noteContent])

  // 流式 AI 响应
  const { isStreaming, startStream, stopStream } = useAIStream({
    onChunk: (chunk) => {
      streamTextRef.current += chunk
      setStreamingContent(streamTextRef.current)
    },
    onFinish: async (fullText) => {
      const currentNoteId = noteIdRef.current
      const userMsg = pendingUserMessageRef.current
      const isRetry = isRetryModeRef.current

      // 流式完成后，一次性写入数据库
      if (currentNoteId) {
        // 普通发送模式：保存用户消息和 AI 响应
        // 重试模式：只保存 AI 响应（用户消息已存在）
        if (!isRetry && userMsg) {
          await chatOperations.add(currentNoteId, 'user', userMsg)
        }
        await chatOperations.add(currentNoteId, 'assistant', fullText)
      }

      // 清理状态
      setPendingUserMessage(null)
      setStreamingContent('')
      setIsStreamingActive(false)
      setIsRetryMode(false)
      streamTextRef.current = ''
    },
    onError: async (error) => {
      const currentNoteId = noteIdRef.current
      const userMsg = pendingUserMessageRef.current
      const isRetry = isRetryModeRef.current

      // 即使出错也保存消息和错误信息
      if (currentNoteId) {
        if (!isRetry && userMsg) {
          await chatOperations.add(currentNoteId, 'user', userMsg)
        }
        await chatOperations.add(currentNoteId, 'assistant', `错误: ${error}`)
      }

      setPendingUserMessage(null)
      setStreamingContent('')
      setIsStreamingActive(false)
      setIsRetryMode(false)
      streamTextRef.current = ''
    },
  })

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming || !noteId) return

    // 设置临时用户消息（不写入数据库）
    setPendingUserMessage(content.trim())
    setIsStreamingActive(true)
    streamTextRef.current = ''
    setStreamingContent('')

    // 开始流式响应
    await startStream('custom', content.trim(), buildContextPrompt())
  }, [noteId, isStreaming, startStream, buildContextPrompt])

  // 发送输入框消息
  const handleSend = async () => {
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    await sendMessage(content)
  }

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 自动调整文本框高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }

  // 复制消息
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  // 编辑用户消息并重新发送
  const handleEdit = useCallback(async (id: number, newContent: string) => {
    if (!noteId) return

    // 删除 ID 大于被编辑消息的所有消息（保持对话历史一致性）
    await db.chatMessages
      .where('noteId')
      .equals(noteId)
      .filter((msg) => msg.id > id)
      .delete()

    // 更新被编辑消息的内容
    await db.chatMessages.update(id, { content: newContent })

    // 触发 AI 重新生成（使用重试模式，不再保存用户消息）
    setIsRetryMode(true)
    setIsStreamingActive(true)
    streamTextRef.current = ''
    setStreamingContent('')

    await startStream('custom', newContent, buildContextPrompt())
  }, [noteId, startStream, buildContextPrompt])

  // 删除消息
  const handleDelete = useCallback(async (id: number) => {
    await chatOperations.delete(id)
  }, [])

  // 重试 AI 响应
  const handleRetry = useCallback(async (message: ChatMessage) => {
    if (!noteId || !messages) return

    // 找到这条 AI 消息之前的用户消息
    const messageIndex = messages.findIndex((m) => m.id === message.id)
    if (messageIndex <= 0) return

    const userMessage = messages[messageIndex - 1]
    if (userMessage.role !== 'user') return

    // 删除当前 AI 消息
    await chatOperations.delete(message.id)

    // 设置重试模式（onFinish 时只保存 AI 响应）
    setIsRetryMode(true)
    setIsStreamingActive(true)
    streamTextRef.current = ''
    setStreamingContent('')

    await startStream('custom', userMessage.content, buildContextPrompt())
  }, [noteId, messages, startStream, buildContextPrompt])

  // 清空对话
  const handleClear = async () => {
    if (isStreaming) {
      stopStream()
    }
    if (noteId) {
      await chatOperations.clearByNoteId(noteId)
    }
    setPendingUserMessage(null)
    setStreamingContent('')
    setIsStreamingActive(false)
    setIsRetryMode(false)
    streamTextRef.current = ''
  }

  if (!isOpen) return null

  // 合并数据库消息和临时流式消息
  const displayMessages: Array<ChatMessage | StreamingMessage & { id?: number }> = [
    ...(messages || []),
  ]

  // 如果有正在发送的消息，添加临时消息（重试模式不显示用户消息，因为已在数据库中）
  if (pendingUserMessage && !isRetryMode) {
    displayMessages.push({
      role: 'user' as const,
      content: pendingUserMessage,
    })
  }
  if (isStreamingActive) {
    displayMessages.push({
      role: 'assistant' as const,
      content: streamingContent,
    })
  }

  return (
    <div className="w-[350px] ai-sidebar-glass border-l border-black/[0.03] dark:border-white/[0.06] flex flex-col h-full ai-chat-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.03] dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#5E6AD2]" strokeWidth={1.5} />
          <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100 tracking-tight">
            AI 助手
          </span>
        </div>
        <div className="flex items-center gap-1">
          {((messages && messages.length > 0) || pendingUserMessage) && (
            <button
              onClick={handleClear}
              className="px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] rounded-md transition-colors"
            >
              清空
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Context Indicator */}
      <div className="px-4 py-2 border-b border-black/[0.03] dark:border-white/[0.06]">
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          正在阅读笔记：{noteTitle || '无标题'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" strokeWidth={1} />
            <p className="text-[13px] text-slate-400 dark:text-slate-500">
              有什么可以帮你的？
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              我可以帮你分析笔记内容、回答问题
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayMessages.map((msg, index) => {
              const isTemp = !('id' in msg) || msg.id === undefined
              const isCurrentStreaming = isTemp && msg.role === 'assistant'

              return (
                <ChatMessageItem
                  key={isTemp ? `temp-${index}` : msg.id}
                  message={msg as ChatMessage}
                  isStreaming={isCurrentStreaming}
                  isTemporary={isTemp}
                  isAnyStreaming={isStreaming || isStreamingActive}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRetry={handleRetry}
                  onInsertToNote={onInsertToNote}
                />
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - 浮动药丸 */}
      <div className="p-4">
        <div className="input-pill flex items-end gap-2 px-4 py-3 border border-black/[0.03] dark:border-white/[0.06]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              adjustTextareaHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            style={{ maxHeight: '150px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={`p-1.5 rounded-lg transition-colors ${
              input.trim() && !isStreaming
                ? 'text-[#5E6AD2] hover:bg-[#5E6AD2]/10'
                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
          Shift + Enter 换行 · Enter 发送
        </p>
      </div>
    </div>
  )
}
