// 从 Markdown 内容提取纯文本预览
export function extractPreview(markdown: string): string {
  const text = markdown
    .replace(/#{1,6}\s/g, '') // 移除标题标记
    .replace(/\*\*|__/g, '') // 移除粗体
    .replace(/\*|_/g, '') // 移除斜体
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // 移除代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接只保留文本
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // 移除图片
    .replace(/\n+/g, ' ') // 换行转空格
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, 80) + (text.length > 80 ? '...' : '')
}

// 格式化日期（相对时间）
export function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

// 格式化日期为 "YYYY年MM月DD日 HH:mm" 格式
export function formatDateTime(date: Date | number): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

// 格式化为简短时间（仅时间）
export function formatTime(date: Date | number): string {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 判断是否是同一天
export function isSameDay(date1: Date | number, date2: Date | number): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}
