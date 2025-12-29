import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Copy, Check } from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'

// 支持的语言列表
const LANGUAGES = [
  { value: 'plaintext', label: '纯文本' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
]

// 获取语言扩展
function getLanguageExtension(language: string): Extension[] {
  switch (language) {
    case 'javascript':
      return [javascript()]
    case 'typescript':
      return [javascript({ typescript: true })]
    case 'python':
      return [python()]
    case 'bash':
    case 'shell':
    case 'sh':
    case 'zsh':
      return [StreamLanguage.define(shell)]
    case 'html':
      return [html()]
    case 'css':
      return [css()]
    case 'json':
      return [json()]
    case 'sql':
      return [sql()]
    case 'java':
      return [java()]
    case 'c':
    case 'cpp':
      return [cpp()]
    case 'rust':
      return [rust()]
    case 'go':
      return [go()]
    default:
      return []
  }
}

export function CodeBlockComponent({
  node,
  updateAttributes,
  getPos,
  editor,
}: NodeViewProps) {
  const [copied, setCopied] = useState(false)
  const language = node.attrs.language || 'plaintext'
  const code = node.textContent || ''

  // 动态获取语言扩展
  const extensions = useMemo(() => {
    return getLanguageExtension(language)
  }, [language])

  // 复制代码
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  // 语言切换
  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateAttributes({ language: e.target.value })
    },
    [updateAttributes]
  )

  // CodeMirror 内容变化
  const handleChange = useCallback(
    (value: string) => {
      if (typeof getPos === 'function') {
        const pos = getPos()
        const tr = editor.state.tr

        // 删除旧内容并插入新内容
        tr.replaceWith(
          pos + 1,
          pos + node.nodeSize - 1,
          value ? editor.state.schema.text(value) : []
        )

        editor.view.dispatch(tr)
      }
    },
    [editor, getPos, node.nodeSize]
  )

  return (
    <NodeViewWrapper
      className="relative rounded-lg overflow-hidden my-4"
      contentEditable={false}
    >
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1b26] border-b border-[#292e42]">
        {/* 语言选择器 */}
        <select
          value={language}
          onChange={handleLanguageChange}
          className="bg-transparent text-[12px] text-gray-400 border-none outline-none cursor-pointer hover:text-white transition-colors"
        >
          {LANGUAGES.map((lang) => (
            <option
              key={lang.value}
              value={lang.value}
              className="bg-[#1a1b26] text-gray-300"
            >
              {lang.label}
            </option>
          ))}
        </select>

        {/* 复制按钮 */}
        <button
          onClick={handleCopy}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#292e42] transition-colors duration-200"
          title="复制代码"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* CodeMirror 编辑器 */}
      <CodeMirror
        value={code}
        theme={tokyoNight}
        extensions={extensions}
        onChange={handleChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightSelectionMatches: true,
        }}
        style={{
          fontSize: '14px',
          fontFamily:
            "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        }}
        className="code-mirror-wrapper"
      />
    </NodeViewWrapper>
  )
}
