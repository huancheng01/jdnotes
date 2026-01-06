import { useState, useMemo, useCallback, useEffect } from 'react'
import { db, noteOperations } from '../lib/db'
import type { Note } from '../lib/db'

export function useNotes(searchQuery: string, currentView: string) {
  // 存储所有笔记的状态
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // 刷新数据
  const refreshNotes = useCallback(async () => {
    try {
      const notes = await db.notes.orderBy('updatedAt').reverse().toArray()
      setAllNotes(notes)
    } catch (e) {
      console.error('Failed to load notes:', e)
    }
  }, [])

  // 初始加载和刷新
  useEffect(() => {
    refreshNotes()
  }, [refreshNotes, refreshKey])

  // 获取所有标签
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

  // 统计数量
  const counts = useMemo(() => {
    if (!allNotes) return { inbox: 0, favorites: 0, trash: 0 }
    return {
      inbox: allNotes.filter((n) => n.isDeleted === 0).length,
      favorites: allNotes.filter((n) => n.isFavorite === 1 && n.isDeleted === 0).length,
      trash: allNotes.filter((n) => n.isDeleted === 1).length,
    }
  }, [allNotes])

  // 根据视图过滤
  const filteredNotes = useMemo(() => {
    if (!allNotes) return []

    if (currentView.startsWith('tag-')) {
      const selectedTag = currentView.slice(4)
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

  // 搜索过滤
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

  // 操作封装 - 每个操作后自动刷新
  const createNote = useCallback(async () => {
    const id = await noteOperations.create()
    setRefreshKey((k) => k + 1)
    return id
  }, [])

  const deleteNote = useCallback(async (id: number) => {
    await noteOperations.softDelete(id)
    setRefreshKey((k) => k + 1)
  }, [])

  const restoreNote = useCallback(async (id: number) => {
    await noteOperations.restore(id)
    setRefreshKey((k) => k + 1)
  }, [])

  const permanentDeleteNote = useCallback(async (id: number) => {
    await noteOperations.permanentDelete(id)
    setRefreshKey((k) => k + 1)
  }, [])

  const toggleFavorite = useCallback(async (id: number) => {
    await noteOperations.toggleFavorite(id)
    setRefreshKey((k) => k + 1)
  }, [])

  const updateTags = useCallback(async (id: number, tags: string[]) => {
    await noteOperations.updateTags(id, tags)
    setRefreshKey((k) => k + 1)
  }, [])

  return {
    allNotes,
    notes,
    allTags,
    counts,
    createNote,
    deleteNote,
    restoreNote,
    permanentDeleteNote,
    toggleFavorite,
    updateTags,
    refreshNotes, // 导出刷新方法供外部使用
  }
}
