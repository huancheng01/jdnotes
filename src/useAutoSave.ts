import { useEffect, useRef, useCallback } from 'react'
import { noteOperations } from './db'

interface UseAutoSaveOptions {
  noteId: number | null
  title: string
  content: string
  delay?: number
}

export function useAutoSave({
  noteId,
  title,
  content,
  delay = 500,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef({ title: '', content: '' })
  const isFirstRender = useRef(true)

  // 保存函数
  const save = useCallback(async () => {
    if (noteId === null) return

    // 检查是否有变化
    if (
      lastSavedRef.current.title === title &&
      lastSavedRef.current.content === content
    ) {
      return
    }

    try {
      await noteOperations.update(noteId, { title, content })
      lastSavedRef.current = { title, content }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [noteId, title, content])

  // 防抖保存
  useEffect(() => {
    // 跳过首次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false
      lastSavedRef.current = { title, content }
      return
    }

    if (noteId === null) return

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      save()
    }, delay)

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [noteId, title, content, delay, save])

  // 组件卸载或 noteId 变化时立即保存
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        // 立即保存
        save()
      }
    }
  }, [noteId, save])

  // 重置首次渲染标记（当 noteId 变化时）
  useEffect(() => {
    isFirstRender.current = true
    lastSavedRef.current = { title, content }
  }, [noteId])

  return { save }
}
