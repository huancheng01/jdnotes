import { Mark, mergeAttributes } from '@tiptap/core'

export interface AIHighlightOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiHighlight: {
      setAIHighlight: () => ReturnType
      unsetAIHighlight: () => ReturnType
      toggleAIHighlight: () => ReturnType
    }
  }
}

export const AIHighlight = Mark.create<AIHighlightOptions>({
  name: 'aiHighlight',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'ai-highlight',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span.ai-highlight',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setAIHighlight:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name)
        },
      unsetAIHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
      toggleAIHighlight:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name)
        },
    }
  },
})
