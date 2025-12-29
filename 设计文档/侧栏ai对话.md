# Role
Senior React Architect specialized in Layout Systems and AI Integrations.

# Context
We are adding a "Context-Aware AI Chat Sidebar" to JD Notes.
- Layout: 4th column on the right.
- Feature: Toggleable (Open/Close), Context-aware (knows current note).

# Requirements

## 1. Layout Refactor (App.tsx)
- Use a `flex` container for the whole app. 
- The Editor area should have `flex-1` to adapt when the Chat Sidebar opens/closes.
- **State**: `isChatOpen` (boolean).
- **Animation**: Use `Framer Motion` or Tailwind `transition-all` to smoothly slide the sidebar in and out.

## 2. AI Chat Sidebar Component (`AIChatSidebar.tsx`)
- **Visual Style (Linear)**: 
  - Width: `w-[350px]`.
  - Background: `bg-gray-50 dark:bg-[#16181D]`.
  - Border: `border-l border-gray-200 dark:border-gray-800`.
- **UI Structure**:
  - **Header**: "AI 助手" title + Close Button (`X` icon).
  - **Message List**: Scrollable area with clean message bubbles. 
    - User messages: Simple text.
    - AI messages: Markdown support (so code snippets in chat look good).
  - **Input Area**: Fixed at bottom. A borderless `textarea` that auto-resizes.
- **Context Injection**:
  - Every message sent should include a hidden `System Prompt`: "You are an assistant. Here is the context of the current note: Title: {title}, Content: {content}. Answer the user's question based on this."

## 3. Toggle Controls
- **Header Button**: In the Editor Header (top right), add a "Sparkles" icon button to toggle the Chat Sidebar.
- **Shortcut**: `Cmd + J` (or `Ctrl + J`) to toggle the sidebar.

## 4. Message Streaming
- Reuse the `useAIStream` logic to ensure AI responses in the sidebar also appear word-by-word (streaming).

# Deliverables
1. Updated `App.tsx` layout logic.
2. `AIChatSidebar.tsx` component code.
3. Updated `EditorHeader.tsx` (or wherever the toggle button lives).
4. The logic to pass `activeNote` content into the chat prompt.

# Visual Polish
- Chat bubbles should be minimalistic (no heavy gradients).
- The "System" info (like "正在阅读笔记...") should be very subtle `text-[10px] text-gray-400`.