import { useState, useCallback, useRef } from 'react'
import { getSettings } from './useSettings'

export type AIAction = 'refine' | 'summarize' | 'translate' | 'continue' | 'custom'

interface UseAIStreamOptions {
  onChunk?: (chunk: string) => void
  onFinish?: (fullText: string) => void
  onError?: (error: string) => void
}

interface UseAIStreamReturn {
  isStreaming: boolean
  streamText: string
  error: string | null
  startStream: (action: AIAction, text: string, customPrompt?: string) => Promise<void>
  stopStream: () => void
}

const SYSTEM_PROMPTS: Record<AIAction, string> = {
  refine: '你是一位专业编辑。请改进以下文本的清晰度、语气和语法。只返回改进后的文本，不要任何解释。',
  summarize: '请用简洁专业的方式总结以下文本，使用要点列表形式。使用与输入文本相同的语言。',
  translate: '你是一位翻译。如果文本是中文，翻译成英文；如果是英文，翻译成中文。只返回翻译结果，不要任何解释。',
  continue: '你是一位创意写作者。请自然流畅地续写以下文本，保持与现有文本一致的风格和语气。只返回续写内容，不要任何前缀。',
  custom: '你是一位乐于助人的AI助手。请精确遵循用户的指示。',
}

export function useAIStream(options: UseAIStreamOptions = {}): UseAIStreamReturn {
  const { onChunk, onFinish, onError } = options
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const startStream = useCallback(
    async (action: AIAction, text: string, customPrompt?: string) => {
      const settings = getSettings()

      if (!settings.aiApiKey) {
        const errorMsg = '请在设置中配置 API Key'
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      // 停止之前的流
      stopStream()

      setIsStreaming(true)
      setStreamText('')
      setError(null)

      abortControllerRef.current = new AbortController()

      const systemPrompt = action === 'custom' && customPrompt
        ? customPrompt
        : SYSTEM_PROMPTS[action]

      const userMessage = action === 'custom' && customPrompt
        ? `${customPrompt}\n\n${text}`
        : text

      try {
        const response = await fetch(`${settings.aiBaseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.aiApiKey}`,
          },
          body: JSON.stringify({
            model: settings.aiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`API 错误: ${response.status} ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('无法读取响应流')
        }

        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  fullText += content
                  setStreamText(fullText)
                  onChunk?.(content)
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }

        setIsStreaming(false)
        onFinish?.(fullText)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // 用户主动停止，不报错
          return
        }
        const errorMsg = err instanceof Error ? err.message : '发生未知错误'
        setError(errorMsg)
        onError?.(errorMsg)
        setIsStreaming(false)
      }
    },
    [onChunk, onFinish, onError, stopStream]
  )

  return {
    isStreaming,
    streamText,
    error,
    startStream,
    stopStream,
  }
}
