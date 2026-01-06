/**
 * TipTap 编辑器类型扩展
 * 解决 tiptap-markdown 扩展的类型安全问题
 */

declare module '@tiptap/core' {
  interface EditorStorage {
    markdown: {
      getMarkdown: () => string
    }
  }
}

// 确保这是一个模块
export {}
