# Chat Sidebar Features

## Image Attachments

Images pasted or dropped into the chat composer are saved to `<project>/.openclaw/images/` and referenced in the message as `[Attached image: .openclaw/images/<filename>]`. Resolve that relative path from the active project root (not workspace root). The agent reads the image file via its `read` tool.

After the agent responds, image files are automatically cleaned up (`_cleanupImages`).

**Workaround**: OpenClaw Chat Completions API doesn't support multimodal `image_url` content. Images are saved to disk instead.

## Reference Chips (📌 Open in Editor)

Each assistant response has a "📌 Open in Editor" button. Clicking it:
1. Saves the response text to `.openclaw/responses/response-N.md`
2. Opens the file in VS Code editor with all text selected
3. User copies (Cmd+C), then pastes (Cmd+V) into Cursor chat prompt → creates a reference chip `≡ response-N.md (lines) ×`

This enables using AI responses as context in Cursor's native chat.

## Chat Persistence

### Tab Switches
Uses VS Code `vsc.setState()`/`vsc.getState()` — messages survive sidebar tab switches instantly (no flicker).

### Cursor Restarts
Messages are saved to `.openclaw/chat-state.json` after each message. On webview init, if `getState()` is empty, messages are loaded from this file.

State is saved as rendered HTML to avoid re-rendering markdown on restore.

### Clear Chat
Clears both `setState` and `chat-state.json`.

## Code Reference Pasting

When code is selected in VS Code editor and pasted (Cmd+V) into the chat composer, the extension detects it matches an editor selection and creates an inline chip instead of plain text. The chip shows `≡ filename (startLine-endLine) ×`.

On send, chips are expanded into the message as code blocks with file path and line references.

## Configuration

Settings in VS Code (`openclaw-review.*`):
- `chat.host` — OpenClaw gateway host (default: `127.0.0.1`)
- `chat.port` — Gateway port (default: `18789`)
- `chat.token` — Gateway auth token
- `chat.agentId` — Agent to connect to (default: `main`)
- `chat.sessionUser` — Session user identifier (default: `vscode-chat`)
