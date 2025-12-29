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
import { AIReviewToolbar } from './AIReviewToolbar'
import { SlashCommand, getDefaultSlashCommands, SlashCommandItem } from './SlashCommand'
import { useAIStream, AIAction, AIContext, TemplateType } from './useAIStream'
import { useAutoTitle } from './useAutoTitle'
import { Sparkles } from 'lucide-react'

interface EditorProps {
  title: string
  content: string
  tags?: string[]
  isEditing: boolean
  createdAt: Date | number
  updatedAt: Date | number
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onTagsChange?: (tags: string[]) => void
  contentToInsert?: string | null // 要插入的内容
  onContentInserted?: () => void // 插入完成后的回调
}

// AI Diff 状态
interface AIDiffState {
  isActive: boolean
  originalText: string
  generatedText: string
  isStreaming: boolean
  action: AIAction | null
  customPrompt?: string
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
  tags = [],
  isEditing,
  createdAt,
  updatedAt,
  onTitleChange,
  onContentChange,
  onTagsChange,
  contentToInsert,
  onContentInserted,
}: EditorProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const diffRef = useRef<HTMLDivElement>(null)

  // 使用 ref 存储最新的 content，避免闭包问题
  const contentRef = useRef(content)
  contentRef.current = content

  // 防止 content 同步覆盖刚接受/放弃的内容
  const skipContentSyncRef = useRef(false)

  // AI 右键菜单状态
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [hasSelection, setHasSelection] = useState(false)

  // AI Diff 状态
  const [diffState, setDiffState] = useState<AIDiffState>({
    isActive: false,
    originalText: '',
    generatedText: '',
    isStreaming: false,
    action: null,
  })
  const [showError, setShowError] = useState<string | null>(null)
  // Ghost 面板位置（基于光标）
  const [ghostPosition, setGhostPosition] = useState<{ top: number; left: number } | null>(null)

  // 自动标题和标签
  const { isGenerating: isGeneratingMeta, generateTitleAndTags } = useAutoTitle()

  // 斜杠菜单状态
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null)
  const slashStartPosRef = useRef<number | null>(null)

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
      if (!diffState.isActive) {
        onContentChange(editor.getHTML())
      }
    },
    onCreate: ({ editor }) => {
      const latestContent = contentRef.current
      if (latestContent) {
        editor.commands.setContent(latestContent, false)
      }
    },
  })

  // AI Stream hook
  const { isStreaming, startStream, stopStream } = useAIStream({
    onChunk: (chunk) => {
      setDiffState(prev => ({
        ...prev,
        generatedText: prev.generatedText + chunk,
      }))
    },
    onFinish: (fullText) => {
      setDiffState(prev => ({
        ...prev,
        generatedText: fullText,
        isStreaming: false,
      }))
    },
    onError: (error) => {
      setShowError(error)
      setTimeout(() => setShowError(null), 3000)
      // 恢复原始文本
      if (editor && diffState.originalText) {
        editor.chain().focus().insertContent(diffState.originalText).run()
      }
      resetDiffState()
    },
  })

  // 获取上下文
  const getContextText = useCallback(() => {
    if (!editor) return ''
    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(0, from, ' ')
    return textBefore.slice(-500)
  }, [editor])

  const buildAIContext = useCallback((): AIContext => ({
    noteTitle: title,
    surroundingText: getContextText().slice(-200),
  }), [title, getContextText])

  // 重置 diff 状态
  const resetDiffState = useCallback(() => {
    setDiffState({
      isActive: false,
      originalText: '',
      generatedText: '',
      isStreaming: false,
      action: null,
    })
    setGhostPosition(null)
  }, [])

  // 处理 AI 操作
  const handleAIAction = useCallback(async (action: AIAction, customPrompt?: string) => {
    if (!editor || !editorContainerRef.current) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    const containerRect = editorContainerRef.current.getBoundingClientRect()

    let textToProcess = ''
    let originalText = ''

    if (action === 'continue') {
      // 续写模式：使用上下文，定位到当前行下一行
      textToProcess = getContextText()
      if (!textToProcess.trim()) {
        setShowError('请先输入一些内容')
        setTimeout(() => setShowError(null), 3000)
        return
      }
      originalText = ''

      // 获取当前行末尾位置，定位到下一行
      const coords = editor.view.coordsAtPos(from)
      setGhostPosition({
        top: coords.bottom - containerRect.top + 4, // 下一行
        left: 0, // 从行首开始
      })
    } else if (selectedText.trim()) {
      // 有选中文本：替换模式，定位到选中位置
      textToProcess = selectedText
      originalText = selectedText

      const coords = editor.view.coordsAtPos(from)
      setGhostPosition({
        top: coords.top - containerRect.top,
        left: coords.left - containerRect.left,
      })

      // 删除选中的文本
      editor.chain().focus().deleteSelection().run()
    } else if (action === 'custom' && customPrompt) {
      // 自定义提问，无选中：定位到当前行下一行
      textToProcess = getContextText()
      originalText = ''

      const coords = editor.view.coordsAtPos(from)
      setGhostPosition({
        top: coords.bottom - containerRect.top + 4,
        left: 0,
      })
    } else {
      return
    }

    setDiffState({
      isActive: true,
      originalText,
      generatedText: '',
      isStreaming: true,
      action,
      customPrompt,
    })

    await startStream(action, textToProcess, customPrompt, buildAIContext())
  }, [editor, getContextText, startStream, buildAIContext])

  // 接受 AI 更改
  const handleAccept = useCallback(() => {
    if (!editor || !diffState.generatedText) return

    // 设置跳过同步标志
    skipContentSyncRef.current = true

    // 先设置编辑器为可编辑
    editor.setEditable(true)

    // 插入内容
    editor.chain().focus().insertContent(diffState.generatedText).run()

    // 立即更新 content 状态，防止被旧内容覆盖
    const newHTML = editor.getHTML()
    onContentChange(newHTML)

    // 重置状态
    resetDiffState()

    // 延迟重置跳过标志
    setTimeout(() => {
      skipContentSyncRef.current = false
    }, 100)
  }, [editor, diffState.generatedText, resetDiffState, onContentChange])

  // 放弃 AI 更改
  const handleDiscard = useCallback(() => {
    if (isStreaming) {
      stopStream()
    }

    // 设置跳过同步标志
    skipContentSyncRef.current = true

    if (editor) {
      // 先设置编辑器为可编辑
      editor.setEditable(true)

      // 恢复原始文本
      if (diffState.originalText) {
        editor.chain().focus().insertContent(diffState.originalText).run()
      }

      // 立即更新 content 状态
      const newHTML = editor.getHTML()
      onContentChange(newHTML)
    }

    resetDiffState()

    // 延迟重置跳过标志
    setTimeout(() => {
      skipContentSyncRef.current = false
    }, 100)
  }, [editor, diffState.originalText, isStreaming, stopStream, resetDiffState, onContentChange])

  // 当 isEditing 变化时更新编辑器可编辑状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing && !diffState.isActive)
    }
  }, [isEditing, editor, diffState.isActive])

  // 当 content prop 变化时更新编辑器内容
  useEffect(() => {
    // 跳过同步标志生效时不更新
    if (skipContentSyncRef.current) return

    if (editor && !editor.isDestroyed && content && !diffState.isActive) {
      const currentHTML = editor.getHTML()
      if (content !== currentHTML) {
        editor.commands.setContent(content, false)
      }
    }
  }, [content, editor, diffState.isActive])

  // 处理从侧栏插入内容
  useEffect(() => {
    if (!contentToInsert || !editor || editor.isDestroyed) return

    // 移动光标到文档末尾
    editor.commands.focus('end')

    // 插入两个换行符和内容
    editor.commands.insertContent('\n\n' + contentToInsert)

    // 更新内容
    const newContent = editor.getHTML()
    onContentChange(newContent)

    // 通知插入完成
    onContentInserted?.()
  }, [contentToInsert, editor, onContentChange, onContentInserted])

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
      if (!isEditing || !editor || diffState.isActive) return

      e.preventDefault()

      const { from, to } = editor.state.selection
      const hasText = from !== to

      setHasSelection(hasText)
      setContextMenuPos({ x: e.clientX, y: e.clientY })
    },
    [isEditing, editor, diffState.isActive]
  )

  const closeContextMenu = useCallback(() => {
    setContextMenuPos(null)
  }, [])

  // 手动生成标题和标签
  const handleGenerateMeta = useCallback(async () => {
    const contentText = editor?.getText() || ''

    if (contentText.length < 20 || isGeneratingMeta) {
      setShowError('内容太少，无法生成')
      setTimeout(() => setShowError(null), 2000)
      return
    }

    const result = await generateTitleAndTags(contentText, title)
    if (result.title) {
      onTitleChange(result.title)
    }
    if (result.tags && onTagsChange) {
      onTagsChange(result.tags)
    }
  }, [title, editor, isGeneratingMeta, generateTitleAndTags, onTitleChange, onTagsChange])

  // 关闭斜杠菜单
  const closeSlashMenu = useCallback(() => {
    setSlashMenuPos(null)
    slashStartPosRef.current = null
  }, [])

  // 处理斜杠命令
  const handleSlashCommand = useCallback((action: string, templateType?: string) => {
    if (!editor || !editorContainerRef.current) return

    // 删除 "/" 字符
    if (slashStartPosRef.current !== null) {
      const { from } = editor.state.selection
      editor.chain().focus().deleteRange({ from: slashStartPosRef.current, to: from }).run()
    }

    closeSlashMenu()

    // 获取光标位置
    const { from } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)
    const containerRect = editorContainerRef.current.getBoundingClientRect()

    // 设置 Ghost 位置
    setGhostPosition({
      top: coords.bottom - containerRect.top + 4,
      left: 0,
    })

    const contextText = getContextText()

    if (action === 'continue') {
      // AI 续写
      setDiffState({
        isActive: true,
        originalText: '',
        generatedText: '',
        isStreaming: true,
        action: 'continue',
      })
      startStream('continue', contextText, undefined, buildAIContext())
    } else if (action === 'template' && templateType) {
      // 模板生成
      setDiffState({
        isActive: true,
        originalText: '',
        generatedText: '',
        isStreaming: true,
        action: 'template',
        customPrompt: templateType,
      })
      startStream('template', contextText, undefined, buildAIContext(), templateType as TemplateType)
    }
  }, [editor, closeSlashMenu, getContextText, startStream, buildAIContext])

  // 斜杠菜单项
  const slashCommands = getDefaultSlashCommands(handleSlashCommand)

  // 监听编辑器输入，检测 "/"
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
      if (!editor || !editorContainerRef.current || diffState.isActive) return

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
        const textFromSlash = editor.state.doc.textBetween(slashStartPosRef.current || 0, from)
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
  }, [editor, slashMenuPos, closeSlashMenu, diffState.isActive])

  // 如果编辑器还没准备好，显示加载状态
  if (!editor) {
    return (
      <div className="flex-1 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-12 py-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {title || '无标题'}
          </h1>
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
        <div className="relative flex items-start gap-2">
          <div className="flex-1">
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
          </div>
          {/* AI 生成标题和标签按钮 */}
          {isEditing && (
            <button
              onClick={handleGenerateMeta}
              disabled={isGeneratingMeta}
              className="mt-2 p-1.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
              title="AI 生成标题和标签"
            >
              {isGeneratingMeta ? (
                <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* 标签显示 */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
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
          ref={editorContainerRef}
          className={`mt-6 relative ${!isEditing ? 'cursor-default' : ''}`}
          onContextMenu={handleContextMenu}
        >
          <EditorContent editor={editor} />

          {/* 斜杠命令菜单 */}
          {slashMenuPos && isEditing && (
            <SlashCommand
              editor={editor}
              items={slashCommands}
              position={slashMenuPos}
              onSelect={(item) => item.action(editor)}
              onClose={closeSlashMenu}
            />
          )}

          {/* Ghost Writing 浮动面板 - 定位到光标位置 */}
          {diffState.isActive && ghostPosition && (
            <div
              ref={diffRef}
              className="absolute z-10 max-w-md"
              style={{
                top: ghostPosition.top,
                left: Math.max(0, ghostPosition.left - 8),
              }}
            >
              {/* 原文（灰色半透明删除线） */}
              {diffState.originalText && (
                <div className="ai-ghost-original text-sm mb-1">
                  {diffState.originalText}
                </div>
              )}

              {/* AI 生成内容（靛蓝色） */}
              <div className="flex items-start gap-1">
                <div className="ai-ghost-text text-sm flex-1 whitespace-pre-wrap">
                  {diffState.generatedText}
                  {diffState.isStreaming && (
                    <span className="ai-streaming-cursor" />
                  )}
                </div>

                {/* 内联工具栏 */}
                {(diffState.generatedText || !diffState.isStreaming) && (
                  <AIReviewToolbar
                    isStreaming={diffState.isStreaming}
                    onAccept={handleAccept}
                    onDiscard={handleDiscard}
                  />
                )}
              </div>

              {/* 生成中但还没内容时显示加载状态 */}
              {diffState.isStreaming && !diffState.generatedText && (
                <AIReviewToolbar
                  isStreaming={true}
                  onAccept={handleAccept}
                  onDiscard={handleDiscard}
                />
              )}
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {showError && (
          <div className="fixed bottom-4 right-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg shadow-lg border border-red-200 dark:border-red-800">
            {showError}
          </div>
        )}
      </div>

      {/* AI 右键菜单 */}
      {isEditing && contextMenuPos && !diffState.isActive && (
        <AIContextMenu
          position={contextMenuPos}
          hasSelection={hasSelection}
          onAction={handleAIAction}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
