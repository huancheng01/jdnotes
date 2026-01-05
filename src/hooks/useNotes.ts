import { useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, noteOperations } from '../lib/db'

export function useNotes(searchQuery: string, currentView: string) {
  // 获取所有笔记
  const allNotes = useLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
    []
  )

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

  // 操作封装
  const createNote = useCallback(async () => {
    return await noteOperations.create()
  }, [])

  const deleteNote = useCallback(async (id: number) => {
    await noteOperations.softDelete(id)
  }, [])

  const restoreNote = useCallback(async (id: number) => {
    await noteOperations.restore(id)
  }, [])

  const permanentDeleteNote = useCallback(async (id: number) => {
    await noteOperations.permanentDelete(id)
  }, [])

  const toggleFavorite = useCallback(async (id: number) => {
    await noteOperations.toggleFavorite(id)
  }, [])

  const updateTags = useCallback(async (id: number, tags: string[]) => {
    await noteOperations.updateTags(id, tags)
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
  }
}
