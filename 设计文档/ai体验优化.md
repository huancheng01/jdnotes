# Role
Senior AI Interaction Designer & React Developer.

# Context
We are optimizing the AI integration in JD Notes. 
Current State: Basic streaming replacement.
Target: Professional, Context-aware AI assistant with a "Review" workflow.

# Goal
Upgrade the AI functionality to include:
1. **Context Injection**: AI should receive Note Title + Surrounding content.
2. **Review State (Accept/Discard)**: AI changes should be revertible.
3. **Smooth Buffering**: Better handling of Markdown parsing during streaming.

# Requirements

## 1. Context-Aware Payload (`useAI.ts`)
Update the API request logic:
- **System Prompt**: "You are a specialized writing assistant for JD Notes. Use the provided context to offer highly relevant suggestions."
- **Payload**: Include `Note Title`, `Selected Text`, and optionally `Previous Paragraph`.
- **Response Format**: Instruct AI to return ONLY the transformed text without preamble (e.g., no "Here is your text:").

## 2. Inline Review Workflow (`Editor.tsx`)
This is the most important UX change:
- **Step 1: Snapshot**: Before AI starts, store the original selected text in a ref or state.
- **Step 2: Distinct Styling**: While AI is streaming, wrap the incoming text in a temporary CSS class (e.g., `.ai-generating`) with a subtle blue/indigo background.
- **Step 3: Action Toolbar**: Once streaming finishes, show a small floating bar above the new text with:
  - **[Check Icon] Accept**: Finalize the change, remove the highlight.
  - **[Rotate Icon] Retry**: Run the prompt again.
  - **[Undo Icon] Discard**: Revert to the original stored snapshot.

## 3. Markdown Streaming Polish
- Use a **Line-based Buffer**: Instead of inserting character-by-character, wait for a full line or a specific delimiter to ensure the `tiptap-markdown` extension parses the blocks correctly (e.g., waiting for the closing ``` before rendering a code block).

## 4. Enhanced UI (Linear Aesthetic)
- **Loading State**: A thin, indigo-colored progress bar at the very top of the editor during AI generation.
- **Typography**: AI-generated text should have a "fade-in" animation as it appears.

# Deliverables
1. Updated `useAIStream` hook with context logic.
2. Logic for `Accept/Discard` state management in `Editor.tsx`.
3. CSS for `.ai-generating` highlight and the Review Toolbar.

# Technical Tip
To handle the "Discard" logic, you can use Tiptap's `editor.commands.undo()` if the AI insertion was a single transaction, or manually replace the range with the cached original text.