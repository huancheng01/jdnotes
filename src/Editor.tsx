import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlock from '@tiptap/extension-code-block'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef, useState, useCallback } from 'react'
import { CodeBlockComponent } from './CodeBlockComponent'
import { ResizableImage } from './ResizableImage'
import { AIContextMenu } from './AIContextMenu'

interface EditorProps {
  title: string
  content: string
  isEditing: boolean
  createdAt: Date | number
  updatedAt: Date | number
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
}

// 格式化日期为 "YYYY年MM月DD日 HH:mm" 格式
function formatDateTime(date: Date | number): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

// 格式化为简短时间（仅时间）
function formatTime(date: Date | number): string {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 判断是否是同一天
function isSameDay(date1: Date | number, date2: Date | number): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function Editor({
  title,
  content,
  isEditing,
  createdAt,
  updatedAt,
  onTitleChange,
  onContentChange,
}: EditorProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null)
  // 使用 ref 存储最新的 content，避免闭包问题
  const contentRef = useRef(content)
  contentRef.current = content

  // AI 右键菜单状态
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [hasSelection, setHasSelection] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
      }),
      CodeBlock.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            language: {
              default: 'plaintext',
              parseHTML: (element) =>
                element.getAttribute('data-language') || 'plaintext',
              renderHTML: (attributes) => ({
                'data-language': attributes.language,
              }),
            },
          }
        },
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent)
        },
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: null,
              parseHTML: (element) => element.getAttribute('width'),
              renderHTML: (attributes) => {
                if (!attributes.width) return {}
                return { width: attributes.width }
              },
            },
          }
        },
        addNodeView() {
          return ReactNodeViewRenderer(ResizableImage)
        },
      }).configure({
        inline: false,
        allowBase64: true,
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: content,
    editable: isEditing,
    editorProps: {
      attributes: {
        class:
          'prose prose-gray dark:prose-invert prose-lg max-w-none focus:outline-none min-h-[300px]',
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML())
    },
    onCreate: ({ editor }) => {
      // 使用 ref 获取最新的 content
      const latestContent = contentRef.current
      if (latestContent) {
        editor.commands.setContent(latestContent, false)
      }
    },
  })

  // 当 isEditing 变化时更新编辑器可编辑状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing)
    }
  }, [isEditing, editor])

  // 当 content prop 变化时更新编辑器内容
  useEffect(() => {
    if (editor && !editor.isDestroyed && content) {
      // 只在内容真正不同时更新
      const currentHTML = editor.getHTML()
      if (content !== currentHTML) {
        editor.commands.setContent(content, false)
      }
    }
  }, [content, editor])

  // 自动调整标题输入框高度
  useEffect(() => {
    const textarea = titleRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [title])

  // 右键菜单处理
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditing || !editor) return

      e.preventDefault()

      // 检查是否有选中文本
      const { from, to } = editor.state.selection
      const hasText = from !== to

      setHasSelection(hasText)
      setContextMenuPos({ x: e.clientX, y: e.clientY })
    },
    [isEditing, editor]
  )

  const closeContextMenu = useCallback(() => {
    setContextMenuPos(null)
  }, [])

  // 如果编辑器还没准备好，显示加载状态或静态内容
  if (!editor) {
    return (
      <div className="flex-1 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-12 py-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {title || '无标题'}
          </h1>
          {/* 日期元数据 */}
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium mt-2 mb-4">
            <span>创建于 {formatDateTime(createdAt)}</span>
            <span>•</span>
            <span>
              最后修改于{' '}
              {isSameDay(createdAt, updatedAt)
                ? formatTime(updatedAt)
                : formatDateTime(updatedAt)}
            </span>
          </div>
          <div
            className="mt-6 prose prose-gray dark:prose-invert prose-lg"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-12 py-8">
        {/* 标题区域 */}
        {isEditing ? (
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="无标题"
            rows={1}
            className="w-full text-4xl font-bold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border-none outline-none bg-transparent tracking-tight resize-none overflow-hidden"
          />
        ) : (
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {title || '无标题'}
          </h1>
        )}

        {/* 日期元数据 */}
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium mt-2 mb-4">
          <span>创建于 {formatDateTime(createdAt)}</span>
          <span>•</span>
          <span>
            最后修改于{' '}
            {isSameDay(createdAt, updatedAt)
              ? formatTime(updatedAt)
              : formatDateTime(updatedAt)}
          </span>
        </div>

        {/* Tiptap 编辑器 */}
        <div
          className={`mt-6 ${!isEditing ? 'cursor-default' : ''}`}
          onContextMenu={handleContextMenu}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* AI 右键菜单 */}
      {isEditing && contextMenuPos && (
        <AIContextMenu
          editor={editor}
          position={contextMenuPos}
          hasSelection={hasSelection}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
