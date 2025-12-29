import { BubbleMenu, Editor } from '@tiptap/react'
import { Sparkles, FileText, Languages, Square } from 'lucide-react'
import { useAIStream, AIAction } from './useAIStream'
import { useCallback, useState } from 'react'

interface AIBubbleMenuProps {
  editor: Editor
}

export function AIBubbleMenu({ editor }: AIBubbleMenuProps) {
  const [showError, setShowError] = useState<string | null>(null)

  const { isStreaming, startStream, stopStream } = useAIStream({
    onChunk: (chunk) => {
      // 实时插入内容
      editor.chain().focus().insertContent(chunk).run()
    },
    onFinish: () => {
      // 流结束，移除高亮样式
    },
    onError: (error) => {
      setShowError(error)
      setTimeout(() => setShowError(null), 3000)
    },
  })

  const handleAction = useCallback(
    async (action: AIAction) => {
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to, ' ')

      if (!selectedText.trim()) return

      // 删除选中的文本
      editor.chain().focus().deleteSelection().run()

      // 开始流式生成
      await startStream(action, selectedText)
    },
    [editor, startStream]
  )

  const menuItems = [
    { action: 'refine' as AIAction, icon: Sparkles, label: '改进写作' },
    { action: 'summarize' as AIAction, icon: FileText, label: '总结摘要' },
    { action: 'translate' as AIAction, icon: Languages, label: '中英互译' },
  ]

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: 'top',
      }}
      shouldShow={({ editor, state }) => {
        // 只在有选中文本时显示
        const { from, to } = state.selection
        return from !== to && !editor.isActive('codeBlock')
      }}
    >
      <div className="flex items-center gap-1 px-1.5 py-1 bg-white dark:bg-dark-sidebar rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        {isStreaming ? (
          <>
            {/* 流式生成中的状态 */}
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400">AI 正在输入...</span>
            </div>
            <button
              onClick={stopStream}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
              title="停止"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          </>
        ) : (
          <>
            {menuItems.map(({ action, icon: Icon, label }) => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                title={label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </>
        )}

        {/* 错误提示 */}
        {showError && (
          <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-800 whitespace-nowrap">
            {showError}
          </div>
        )}
      </div>
    </BubbleMenu>
  )
}
