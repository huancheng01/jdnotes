import { useState, useRef, useCallback, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import { getDefaultSlashCommands } from '../components/editor/SlashCommand'

interface UseSlashCommandProps {
  editor: Editor | null
  editorContainerRef: React.RefObject<HTMLDivElement | null>
  onAIAction: (action: string, templateType?: string) => void
  diffStateActive: boolean
}

export function useSlashCommand({
  editor,
  editorContainerRef,
  onAIAction,
  diffStateActive,
}: UseSlashCommandProps) {
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null)
  const slashStartPosRef = useRef<number | null>(null)

  // 关闭斜杠菜单
  const closeSlashMenu = useCallback(() => {
    setSlashMenuPos(null)
    slashStartPosRef.current = null
  }, [])

  // 处理斜杠命令选中
  const handleSlashCommandSelect = useCallback(
    (action: string, templateType?: string) => {
      if (!editor || !editorContainerRef.current) return

      // 删除 "/" 字符
      if (slashStartPosRef.current !== null) {
        const { from } = editor.state.selection
        editor
          .chain()
          .focus()
          .deleteRange({ from: slashStartPosRef.current, to: from })
          .run()
      }

      closeSlashMenu()
      onAIAction(action, templateType)
    },
    [editor, editorContainerRef, closeSlashMenu, onAIAction]
  )

  // 获取菜单项
  const slashCommands = getDefaultSlashCommands(handleSlashCommandSelect)

  // 监听输入和键盘事件
  useEffect(() => {
    if (!editor || !editorContainerRef.current) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果斜杠菜单已打开且按下 Escape，关闭菜单
      if (slashMenuPos && event.key === 'Escape') {
        closeSlashMenu()
        return
      }
    }

    const handleInput = () => {
      if (!editor || !editorContainerRef.current || diffStateActive) return

      const { from } = editor.state.selection
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from)

      if (textBefore === '/') {
        // 显示斜杠菜单
        const coords = editor.view.coordsAtPos(from)
        const containerRect = editorContainerRef.current.getBoundingClientRect()

        setSlashMenuPos({
          top: coords.bottom - containerRect.top + 4,
          left: coords.left - containerRect.left,
        })
        slashStartPosRef.current = from - 1
      } else if (slashMenuPos) {
        // 如果输入了其他字符，关闭菜单
        const textFromSlash = editor.state.doc.textBetween(
          slashStartPosRef.current || 0,
          from
        )
        if (!textFromSlash.startsWith('/') || textFromSlash.includes(' ')) {
          closeSlashMenu()
        }
      }
    }

    editor.on('update', handleInput)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      editor.off('update', handleInput)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, editorContainerRef, slashMenuPos, closeSlashMenu, diffStateActive])

  return {
    slashMenuPos,
    slashCommands,
    closeSlashMenu,
  }
}
