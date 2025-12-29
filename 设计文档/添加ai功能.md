# Role
Senior Frontend Engineer specialized in Tiptap, OpenAI Streaming, and React Hooks.

# Context
We are upgrading JD Notes with a **Streaming AI Assistant**.
- Settings: `aiApiKey`, `aiBaseUrl`, `aiModel` are stored in `localStorage`.
- UI: Use Tiptap's `BubbleMenu` and `FloatingMenu`.

# Goal
Implement a robust AI streaming system where the AI response appears word-by-word directly inside the editor, replacing or following the user's selection.

# Requirements

## 1. Streaming AI Hook (`useAIStream.ts`)
Create a custom hook to handle the API communication:
- **Streaming Logic**: Use the native `fetch` API with `ReadableStream` to handle Server-Sent Events (SSE).
- **OpenAI Compatibility**: Support the `/chat/completions` endpoint with `stream: true`.
- **Parsing**: Use `TextDecoder` to parse chunks and extract `content` from the JSON `delta`.
- **Callbacks**: Provide `onChunk` and `onFinish` callbacks so the editor can update in real-time.

## 2. Editor Integration Logic
- **Selection Handling**: 
  - If selecting text (Bubble Menu): When AI starts, delete the selection and start inserting the stream at that position.
  - If new line (Floating Menu): Start inserting at the current cursor.
- **Tiptap Commands**: Use `editor.chain().focus().insertContent(chunk).run()` for each incoming chunk to ensure the cursor moves naturally with the text.

## 3. UI Components (Linear Style)

### A. AIBubbleMenu.tsx
- **Trigger**: Visible when text is selected.
- **Actions**:
  - ✨ **改进写作** (Refine)
  - 📝 **总结摘要** (Summarize)
  - 🌐 **中英互译** (Translate)
- **Visuals**: Dark/Light themed small toolbar. Show a "Stop" button or a shimmering "AI is typing..." indicator during the stream.

### B. AIFloatingMenu.tsx
- **Trigger**: Visible on empty lines.
- **Actions**: "AI 续写" (Continue writing) or "自由提问" (Custom prompt via a small input field).

## 4. Error Handling & Polish
- **Empty Key Check**: If `apiKey` is missing, show a subtle toast or message: "请在设置中配置 API Key".
- **UX**: Ensure the editor is not "locked" during streaming, but ideally, prevent user typing in the specific area being updated to avoid collisions.
- **Styling**: AI-generated text should have a temporary "highlight" or different color (e.g., Indigo text) while it's being streamed, then revert to normal text.

# Deliverables
1. `npm install @tiptap/extension-bubble-menu @tiptap/extension-floating-menu`.
2. The complete `useAIStream.ts` hook code.
3. Updated `Editor.tsx` with the streaming insertion logic.
4. `AIBubbleMenu.tsx` and `AIFloatingMenu.tsx` component code.

# Prompt Engineering (System Prompts)
- **Refine**: "You are a professional editor. Improve the following text for clarity, tone, and grammar. Return ONLY the improved text."
- **Summarize**: "Summarize the text in a concise, professional manner using bullet points."