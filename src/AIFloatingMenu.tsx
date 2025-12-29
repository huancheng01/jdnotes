import { FloatingMenu, Editor } from '@tiptap/react'
import { Sparkles, MessageSquare, Square, Send } from 'lucide-react'
import { useAIStream } from './useAIStream'
import { useCallback, useState } from 'react'

interface AIFloatingMenuProps {
  editor: Editor
}

export function AIFloatingMenu({ editor }: AIFloatingMenuProps) {
  const [showInput, setShowInput] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showError, setShowError] = useState<string | null>(null)

  const { isStreaming, startStream, stopStream } = useAIStream({
    onChunk: (chunk) => {
      editor.chain().focus().insertContent(chunk).run()
    },
    onFinish: () => {
      setShowInput(false)
      setCustomPrompt('')
    },
    onError: (error) => {
      setShowError(error)
      setTimeout(() => setShowError(null), 3000)
    },
  })

  // 获取光标之前的文本作为上下文
  const getContextText = useCallback(() => {
    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(0, from, ' ')
    // 取最后 500 个字符作为上下文
    return textBefore.slice(-500)
  }, [editor])

  const handleContinue = useCallback(async () => {
    const context = getContextText()
    if (!context.trim()) {
      setShowError('请先输入一些内容')
      setTimeout(() => setShowError(null), 3000)
      return
    }
    await startStream('continue', context)
  }, [getContextText, startStream])

  const handleCustomPrompt = useCallback(async () => {
    if (!customPrompt.trim()) return
    const context = getContextText()
    await startStream('custom', context, customPrompt)
  }, [customPrompt, getContextText, startStream])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomPrompt()
    }
    if (e.key === 'Escape') {
      setShowInput(false)
      setCustomPrompt('')
    }
  }

  return (
    <FloatingMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: 'bottom-start',
      }}
      shouldShow={({ editor, state }) => {
        // 只在空行时显示
        const { $from } = state.selection
        const isEmptyTextBlock =
          $from.parent.isTextblock &&
          $from.parent.textContent === '' &&
          $from.parent.type.name === 'paragraph'
        return isEmptyTextBlock && !editor.isActive('codeBlock')
      }}
    >
      <div className="flex flex-col gap-1 p-1.5 bg-white dark:bg-dark-sidebar rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px]">
        {isStreaming ? (
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400">AI 正在输入...</span>
            </div>
            <button
              onClick={stopStream}
              className="p-1 text-gray-500 hover:text-red-500 rounded transition-colors"
              title="停止"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>
        ) : showInput ? (
          <div className="flex flex-col gap-2 p-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题..."
                autoFocus
                className="flex-1 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white"
              />
              <button
                onClick={handleCustomPrompt}
                disabled={!customPrompt.trim()}
                className="p-1.5 text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => {
                setShowInput(false)
                setCustomPrompt('')
              }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              取消
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI 续写</span>
            </button>
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>自由提问</span>
            </button>
          </>
        )}

        {/* 错误提示 */}
        {showError && (
          <div className="px-2 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded">
            {showError}
          </div>
        )}
      </div>
    </FloatingMenu>
  )
}
