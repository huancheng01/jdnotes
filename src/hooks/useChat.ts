import { useState, useRef, useEffect, useCallback } from 'react'
import { chatOperations, type ChatMessage } from '../lib/db'
import { useAIStream } from './useAIStream'

interface UseChatProps {
  noteId: number | null
  noteTitle: string
  noteContent: string
}

export function useChat({ noteId, noteTitle, noteContent }: UseChatProps) {
  const [input, setInput] = useState('')
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreamingActive, setIsStreamingActive] = useState(false)
  const [isRetryMode, setIsRetryMode] = useState(false)

  const streamTextRef = useRef('')
  const pendingUserMessageRef = useRef<string | null>(null)
  const noteIdRef = useRef<number | null>(null)
  const isRetryModeRef = useRef(false)

  // Sync refs
  useEffect(() => {
    pendingUserMessageRef.current = pendingUserMessage
    noteIdRef.current = noteId
    isRetryModeRef.current = isRetryMode
  }, [pendingUserMessage, noteId, isRetryMode])

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Refresh messages from database
  const refreshMessages = useCallback(async () => {
    if (noteId) {
      try {
        const data = await chatOperations.getByNoteId(noteId)
        setMessages(data)
      } catch (error) {
        console.error('Failed to load chat messages:', error)
      }
    } else {
      setMessages([])
    }
  }, [noteId])

  // Load messages when noteId changes
  useEffect(() => {
    refreshMessages()
  }, [refreshMessages])

  // Build context prompt
  const buildContextPrompt = useCallback(() => {
    return `你是 JD Notes 的 AI 助手。

当前笔记上下文：
- 标题：${noteTitle || '无标题'}
- 内容：${noteContent.slice(0, 2000)}${noteContent.length > 2000 ? '...(内容已截断)' : ''}

请根据用户的问题提供帮助。如果问题与笔记内容相关，请结合笔记上下文作答。`
  }, [noteTitle, noteContent])

  // AI Stream
  const { isStreaming, startStream, stopStream } = useAIStream({
    onChunk: (chunk) => {
      streamTextRef.current += chunk
      setStreamingContent(streamTextRef.current)
    },
    onFinish: async (fullText) => {
      const currentNoteId = noteIdRef.current
      const userMsg = pendingUserMessageRef.current
      const isRetry = isRetryModeRef.current

      if (currentNoteId) {
        if (!isRetry && userMsg) {
          await chatOperations.add(currentNoteId, 'user', userMsg)
        }
        await chatOperations.add(currentNoteId, 'assistant', fullText)
      }

      setPendingUserMessage(null)
      setStreamingContent('')
      setIsStreamingActive(false)
      setIsRetryMode(false)
      streamTextRef.current = ''
      // 刷新消息列表
      await refreshMessages()
    },
    onError: async (error) => {
      const currentNoteId = noteIdRef.current
      const userMsg = pendingUserMessageRef.current
      const isRetry = isRetryModeRef.current

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
      // 刷新消息列表
      await refreshMessages()
    },
  })

  // Actions
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming || !noteId) return

    const trimmedContent = content.trim()
    
    // 同步更新 ref，确保在 onError 回调中能获取到正确的值
    pendingUserMessageRef.current = trimmedContent
    
    setPendingUserMessage(trimmedContent)
    setIsStreamingActive(true)
    streamTextRef.current = ''
    setStreamingContent('')

    await startStream('custom', trimmedContent, buildContextPrompt())
  }, [noteId, isStreaming, startStream, buildContextPrompt])

  const handleSend = async () => {
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    await sendMessage(content)
  }

  const handleEdit = useCallback(async (id: number, newContent: string) => {
    if (!noteId) return

    // 获取当前消息列表，删除该消息之后的所有消息
    const currentMessages = await chatOperations.getByNoteId(noteId)
    const editedMessage = currentMessages.find(m => m.id === id)
    if (editedMessage) {
      // 删除编辑消息之后的所有消息
      await chatOperations.deleteAfter(noteId, editedMessage.timestamp)
    }

    // 更新消息内容
    await chatOperations.update(id, newContent)
    
    // 刷新消息列表
    await refreshMessages()

    setIsRetryMode(true)
    setIsStreamingActive(true)
    streamTextRef.current = ''
    setStreamingContent('')

    await startStream('custom', newContent, buildContextPrompt())
  }, [noteId, startStream, buildContextPrompt, refreshMessages])

  const handleDelete = useCallback(async (id: number) => {
    await chatOperations.delete(id)
    await refreshMessages()
  }, [refreshMessages])

  const handleRetry = useCallback(async (message: ChatMessage) => {
    if (!noteId || !messages) return

    const messageIndex = messages.findIndex((m) => m.id === message.id)
    if (messageIndex <= 0) return

    const userMessage = messages[messageIndex - 1]
    if (userMessage.role !== 'user') return

    await chatOperations.delete(message.id)

    setIsRetryMode(true)
    setIsStreamingActive(true)
    streamTextRef.current = ''
    setStreamingContent('')

    await startStream('custom', userMessage.content, buildContextPrompt())
  }, [noteId, messages, startStream, buildContextPrompt])

  const handleClear = useCallback(async () => {
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
    setMessages([])
  }, [isStreaming, noteId, stopStream])

  return {
    input,
    setInput,
    messages,
    pendingUserMessage,
    streamingContent,
    isStreamingActive,
    isStreaming,
    isRetryMode,
    handleSend,
    handleEdit,
    handleDelete,
    handleRetry,
    handleClear,
  }
}
