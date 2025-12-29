# Role
Senior Tiptap & Prosemirror Developer.

# Issue
The AI returns raw Markdown strings (e.g., "# Title", "```bash"), but Tiptap renders them as literal text instead of Rich Text (Headings, Code Blocks). Manual typing works, but programmatic streaming insertion fails to trigger Markdown parsing.

# Goal
Enable the Tiptap editor to parse and render Markdown strings automatically during AI streaming.

# Requirements

## 1. Library Installation
- Install `tiptap-markdown` (or use the built-in Markdown handling if using Tiptap v2.x advanced config). 
- *Recommendation:* Use `tiptap-markdown` to provide the `Markdown` extension.

## 2. Editor Configuration (`Editor.tsx`)
- Import `Markdown` from `tiptap-markdown`.
- Add `Markdown` to the `extensions` array in `useEditor`.
- **Crucial Configuration:** Ensure the Markdown extension is configured to handle both input and output.

## 3. Update AI Insertion Logic
- In the AI streaming hook/logic, ensure you are using `editor.commands.insertContent(chunk)`. 
- **The Magic Fix:** Because the `Markdown` extension is active, Tiptap will now intercept the string and parse it as Markdown before turning it into nodes.
- **Handling Code Blocks:** Verify that the Markdown extension correctly identifies ` ``` ` and maps it to the `CodeBlockLowlight` (or our CodeMirror 6) extension we built earlier.

## 4. Specific Fix for Streaming
- Since AI streams content chunk-by-chunk, sometimes a single chunk like `#` won't trigger a heading until the space ` ` is sent. 
- Ensure the `Markdown` extension is configured with `{ html: false, tightLists: true }` to keep the parsing logic consistent.

# Deliverables
1. `npm install tiptap-markdown`.
2. Updated `extensions` list for `Editor.tsx`.
3. Guidance on how to ensure AI-generated code blocks trigger our custom `CodeBlockComponent`.

# Note
If the AI is streaming very small chunks (character by character), Tiptap's parser might be too aggressive. I might need a "Markdown to HTML" transformer (like `marked`) before `insertContent`, but try the `tiptap-markdown` extension first as it's the cleanest solution.