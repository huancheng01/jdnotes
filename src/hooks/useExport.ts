import { useCallback, useState } from 'react'

interface ExportOptions {
  title: string
  content: string
  tags?: string[]
}

// 生成完整的 Markdown 文件内容
function generateMarkdown(options: ExportOptions): string {
  const { title, content, tags } = options
  
  let markdown = `# ${title}\n\n`
  
  if (tags && tags.length > 0) {
    markdown += `> 标签：${tags.join(', ')}\n\n`
  }
  
  markdown += content
  
  return markdown
}

// 下载文件
function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Markdown 转 HTML（简单实现，用于 PDF 导出）
function markdownToHTML(markdown: string): string {
  let html = markdown
    // 代码块（需要在其他规则之前处理）
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 水平线
    .replace(/^---$/gm, '<hr>')
    // 换行
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  
  // 包装段落
  html = `<p>${html}</p>`
  
  // 清理空段落
  html = html.replace(/<p><\/p>/g, '')
  
  // 包装列表项
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>')
  
  return html
}

// 生成 PDF 样式
function getPDFStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1a1a1a;
        padding: 40px;
        max-width: 800px;
        margin: 0 auto;
      }
      h1 {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 24px;
        color: #111;
        border-bottom: 2px solid #5E6AD2;
        padding-bottom: 12px;
      }
      h2 {
        font-size: 22px;
        font-weight: 600;
        margin-top: 32px;
        margin-bottom: 16px;
        color: #222;
      }
      h3 {
        font-size: 18px;
        font-weight: 600;
        margin-top: 24px;
        margin-bottom: 12px;
        color: #333;
      }
      p {
        margin-bottom: 16px;
      }
      blockquote {
        border-left: 4px solid #5E6AD2;
        padding-left: 16px;
        margin: 16px 0;
        color: #666;
        font-style: italic;
      }
      code {
        background: #f4f4f5;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: "SF Mono", Monaco, "Courier New", monospace;
        font-size: 13px;
      }
      pre {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 16px 0;
      }
      pre code {
        background: transparent;
        padding: 0;
        color: inherit;
      }
      ul, ol {
        margin: 16px 0;
        padding-left: 24px;
      }
      li {
        margin-bottom: 8px;
      }
      a {
        color: #5E6AD2;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      hr {
        border: none;
        border-top: 1px solid #e5e5e5;
        margin: 24px 0;
      }
      strong {
        font-weight: 600;
      }
      em {
        font-style: italic;
      }
      .tags {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      .tag {
        background: #f0f1ff;
        color: #5E6AD2;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
      }
    </style>
  `
}

// 生成 PDF HTML 内容
function generatePDFHTML(options: ExportOptions): string {
  const { title, content, tags } = options
  
  let tagsHTML = ''
  if (tags && tags.length > 0) {
    tagsHTML = `
      <div class="tags">
        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `
  }
  
  const contentHTML = markdownToHTML(content)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${getPDFStyles()}
    </head>
    <body>
      <h1>${title}</h1>
      ${tagsHTML}
      <div class="content">
        ${contentHTML}
      </div>
    </body>
    </html>
  `
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false)

  // 导出为 Markdown
  const exportAsMarkdown = useCallback((options: ExportOptions) => {
    const { title } = options
    const markdown = generateMarkdown(options)
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.md`
    downloadFile(markdown, filename, 'text/markdown;charset=utf-8')
  }, [])

  // 导出为 PDF（使用浏览器打印功能）
  const exportAsPDF = useCallback((options: ExportOptions) => {
    setIsExporting(true)
    
    try {
      // 使用浏览器打印功能导出 PDF
      const htmlContent = generatePDFHTML(options)
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        printWindow.focus()
        
        // 等待样式加载后打印
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [])

  return {
    isExporting,
    exportAsMarkdown,
    exportAsPDF,
  }
}
