import { useEffect, useRef, useCallback } from 'react'
import { noteOperations } from '../lib/db'

interface UseAutoSaveOptions {
  noteId: number | null
  title: string
  content: string
  delay?: number
}

// 待保存数据的类型
interface PendingData {
  noteId: number
  title: string
  content: string
}

// 全局保存队列，确保页面关闭时能访问到
let globalPendingData: PendingData | null = null

// 同步保存函数（用于 beforeunload）
function syncSave(data: PendingData | null) {
  if (!data) return
  
  // 使用 navigator.sendBeacon 或者同步 XMLHttpRequest 作为备选
  // 但由于我们使用 IndexedDB，这里我们使用 localStorage 作为临时缓存
  try {
    const pendingKey = `jdnotes_pending_save_${data.noteId}`
    localStorage.setItem(pendingKey, JSON.stringify({
      title: data.title,
      content: data.content,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.error('Failed to save pending data to localStorage:', e)
  }
}

// 在应用启动时恢复未保存的数据
export async function recoverPendingSaves() {
  const keysToRemove: string[] = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('jdnotes_pending_save_')) {
      try {
        const noteIdStr = key.replace('jdnotes_pending_save_', '')
        const noteId = parseInt(noteIdStr, 10)
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        
        if (data.title !== undefined && data.content !== undefined) {
          // 检查笔记是否存在
          const note = await noteOperations.get(noteId)
          if (note) {
            // 恢复数据
            await noteOperations.update(noteId, {
              title: data.title,
              content: data.content
            })
            console.log(`Recovered pending save for note ${noteId}`)
          }
        }
        
        keysToRemove.push(key)
      } catch (e) {
        console.error('Failed to recover pending save:', e)
        keysToRemove.push(key!)
      }
    }
  }
  
  // 清理已恢复的数据
  keysToRemove.forEach(key => localStorage.removeItem(key))
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
  const isSavingRef = useRef(false)
  
  // 使用 ref 存储当前数据，避免闭包问题
  const currentDataRef = useRef({ noteId, title, content })
  currentDataRef.current = { noteId, title, content }
  
  // 存储上一个 noteId，用于在切换笔记时保存旧数据
  const prevNoteIdRef = useRef<number | null>(null)
  const prevDataRef = useRef<{ title: string; content: string } | null>(null)

  // 检查是否有未保存的变化
  const hasUnsavedChanges = useCallback(() => {
    return (
      lastSavedRef.current.title !== currentDataRef.current.title ||
      lastSavedRef.current.content !== currentDataRef.current.content
    )
  }, [])

  // 保存函数 - 使用 ref 中的数据
  const saveWithData = useCallback(async (
    targetNoteId: number,
    targetTitle: string,
    targetContent: string
  ) => {
    // 防止重复保存
    if (isSavingRef.current) return
    
    try {
      isSavingRef.current = true
      await noteOperations.update(targetNoteId, {
        title: targetTitle,
        content: targetContent
      })
      
      // 只有当保存的是当前笔记时才更新 lastSavedRef
      if (targetNoteId === currentDataRef.current.noteId) {
        lastSavedRef.current = { title: targetTitle, content: targetContent }
      }
      
      // 清除 localStorage 中的临时数据
      localStorage.removeItem(`jdnotes_pending_save_${targetNoteId}`)
      
      // 清除全局待保存数据
      if (globalPendingData?.noteId === targetNoteId) {
        globalPendingData = null
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      isSavingRef.current = false
    }
  }, [])

  // 当前笔记的保存函数
  const save = useCallback(async () => {
    const { noteId: currentNoteId, title: currentTitle, content: currentContent } = currentDataRef.current
    
    if (currentNoteId === null) return
    
    // 检查是否有变化
    if (
      lastSavedRef.current.title === currentTitle &&
      lastSavedRef.current.content === currentContent
    ) {
      return
    }

    await saveWithData(currentNoteId, currentTitle, currentContent)
  }, [saveWithData])

  // 立即保存（用于关键时刻）
  const saveImmediately = useCallback(async () => {
    // 清除待执行的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    await save()
  }, [save])

  // 防抖保存
  useEffect(() => {
    // 跳过首次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false
      lastSavedRef.current = { title, content }
      return
    }

    if (noteId === null) return

    // 更新全局待保存数据
    if (hasUnsavedChanges()) {
      globalPendingData = { noteId, title, content }
    }

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
  }, [noteId, title, content, delay, save, hasUnsavedChanges])

  // 当 noteId 变化时，先保存旧笔记的数据
  useEffect(() => {
    // 如果有上一个笔记，且有未保存的数据，则保存
    if (
      prevNoteIdRef.current !== null &&
      prevNoteIdRef.current !== noteId &&
      prevDataRef.current !== null
    ) {
      const prevId = prevNoteIdRef.current
      const prevData = prevDataRef.current
      
      // 检查是否有变化
      if (
        lastSavedRef.current.title !== prevData.title ||
        lastSavedRef.current.content !== prevData.content
      ) {
        // 保存上一个笔记的数据
        saveWithData(prevId, prevData.title, prevData.content)
      }
    }

    // 更新前一个笔记的引用
    prevNoteIdRef.current = noteId
    
    // 重置状态
    isFirstRender.current = true
    lastSavedRef.current = { title, content }
    
    return () => {
      // 在 noteId 变化前保存当前数据到 prevDataRef
      prevDataRef.current = { title, content }
    }
  }, [noteId]) // 注意：不要将 title, content 加入依赖，否则会导致循环

  // 更新 prevDataRef（在每次 title/content 变化时）
  useEffect(() => {
    prevDataRef.current = { title, content }
  }, [title, content])

  // 页面可见性变化时保存
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时立即保存
        if (hasUnsavedChanges()) {
          // 同步保存到 localStorage 作为备份
          if (currentDataRef.current.noteId !== null) {
            syncSave({
              noteId: currentDataRef.current.noteId,
              title: currentDataRef.current.title,
              content: currentDataRef.current.content
            })
          }
          // 同时尝试异步保存到数据库
          save()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [save, hasUnsavedChanges])

  // 页面关闭前保存
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges() && currentDataRef.current.noteId !== null) {
        // 同步保存到 localStorage
        syncSave({
          noteId: currentDataRef.current.noteId,
          title: currentDataRef.current.title,
          content: currentDataRef.current.content
        })
        
        // 显示确认对话框（某些浏览器需要）
        e.preventDefault()
        // Chrome 需要设置 returnValue
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      // 同步保存到 localStorage 作为最后保障
      if (currentDataRef.current.noteId !== null) {
        const { noteId: id, title: t, content: c } = currentDataRef.current
        if (
          lastSavedRef.current.title !== t ||
          lastSavedRef.current.content !== c
        ) {
          syncSave({ noteId: id, title: t, content: c })
        }
      }
    }
  }, [])

  return { save, saveImmediately, hasUnsavedChanges }
}
