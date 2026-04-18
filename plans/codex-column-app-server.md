# Feature: Codex Column via app-server

## Overview
Thêm một cột mới trong IDE để hoạt động theo mô hình của Codex VS Code extension, dùng `codex app-server` làm backend protocol thay vì mock local chat. Cột này phải hỗ trợ:

- khởi tạo và resume thread theo project/workspace
- gửi user input và stream turn/item theo thời gian thực
- hiển thị timeline hội thoại và trạng thái agent
- xử lý approval request inline
- lưu và khôi phục session UI đủ để người dùng quay lại luồng làm việc trước đó

Mục tiêu thực tế cho đợt đầu là đưa app hiện tại từ mô hình "project tree + editor + terminal" sang "project tree + editor + codex column", trong đó Codex column có thể dùng được cho luồng chat-agent cơ bản và bám theo lifecycle của `codex app-server`.

## Current Project Survey
- App hiện tại là Electron + Vite + React + Zustand, chưa có backend service layer ngoài Electron IPC.
- Layout chính nằm ở [src/components/Workspace.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Workspace.tsx) với 3 vùng:
  - trái: file tree
  - giữa: editor
  - phải: terminal
- Global state tập trung ở [src/store/store.ts](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/store/store.ts).
- Electron bridge hiện chỉ expose filesystem/session/PTy API qua [electron/preload.ts](/Volumes/ExData/Documents/OtherProjects/ide-cli/electron/preload.ts) và [src/shared/ipc.ts](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/shared/ipc.ts).
- Electron main process trong [electron/main.ts](/Volumes/ExData/Documents/OtherProjects/ide-cli/electron/main.ts) chưa có long-lived service nào ngoài PTY manager.
- Repo đã có pattern viết plan trong `plans/` và đã có session persistence cho workspace.

## Findings From CODEX_APP_SERVER.md
- `codex app-server` dùng JSON-RPC 2.0 theo transport stdio hoặc websocket; phù hợp nhất với Electron là spawn local process và giao tiếp qua stdio.
- Đơn vị dữ liệu cốt lõi:
  - `thread`: conversation/session
  - `turn`: một lần user gửi input và agent chạy
  - `item`: message, reasoning, tool call, command, file change, approval, tool result
- Luồng chính cần có:
  - `initialize` rồi `initialized`
  - `thread/start`, `thread/resume`, tùy giai đoạn có thể thêm `thread/list`, `thread/archive`, `thread/fork`
  - `turn/start`, `turn/interrupt`, có thể thêm `turn/steer`
  - lắng nghe notifications như `thread/started`, `turn/started`, `item/started`, `item/completed`, `item/agentMessage/delta`, `turn/completed`
- Approval là server-initiated JSON-RPC request, không phải notification. UI phải trả lời request cho command/file-change/request-permissions.
- app-server có auth/account surface và MCP surface, nhưng đây không phải blocker cho phase chat cơ bản.

## Assumptions
- Máy người dùng đã có CLI `codex` và hỗ trợ lệnh `codex app-server`.
- Phase đầu chỉ cần `stdio` transport, không cần websocket.
- Phase đầu tập trung vào text-first experience; audio/realtime và dynamic tool calls để sau.
- Một project tương ứng một primary Codex thread context đang mở trong UI. Thread history đầy đủ vẫn được lưu riêng để resume.
- Cột mới sẽ thay thế terminal panel hiện tại ở cạnh phải thay vì cố render đồng thời terminal và Codex trong cùng chiều ngang từ ngày đầu.
- Session restore chỉ cần khôi phục active thread id, thread list đã load và draft input; không cần reconstruct toàn bộ server-side streaming state đang dang dở.

## Out Of Scope For Initial Delivery
- Account login UX hoàn chỉnh cho mọi auth mode.
- MCP browser chuyên dụng, resource viewer, plugin/app marketplace integration.
- Realtime audio session, WebRTC transport.
- Multi-column agent UI hoặc nhiều thread song song trong cùng một project view.
- Pixel-perfect clone toàn bộ Codex VS Code extension.

## Dependencies
- Không cần thư viện UI mới cho plan cơ sở.
- Có thể giữ nguyên `child_process` built-in của Node/Electron để spawn `codex app-server`.
- Nếu cần robust event emitter hoặc schema validation:
  - ưu tiên tự viết type guards trước
  - chỉ thêm `zod` khi JSON-RPC payload bắt đầu quá rộng để maintain bằng type guards thủ công
- Yêu cầu runtime bên ngoài:
  - `codex` CLI có trong `PATH`, hoặc có config để chỉ rõ absolute path

## Architecture
### 1. Electron app-server service
- Tạo một manager mới trong Electron main để:
  - spawn `codex app-server`
  - ghi request JSON-RPC qua stdin
  - parse từng message JSON từ stdout
  - phân biệt response, notification, server-initiated request
  - forward event sang renderer qua IPC
- Manager phải có các năng lực:
  - `connect`
  - `initialize`
  - `request(method, params)`
  - `respond(requestId, result)`
  - `shutdown/restart`
  - health state: `idle | starting | ready | failed`
- Nên giữ 1 app-server process cho toàn app trước, không spawn theo project.

### 2. Shared protocol layer
- Tạo shared types riêng cho:
  - app-server connection status
  - thread summary
  - turn summary
  - timeline item
  - pending server request / approval request
  - command/file-change approval decision payload
- Không trộn protocol types của Codex với workspace types hiện tại trong cùng file dài; nên tách thêm module shared riêng như `src/shared/codex.ts`.

### 3. Renderer store slice
- Mở rộng Zustand store hoặc tách slice mới cho Codex:
  - connection state
  - thread ids theo project
  - active thread id theo project
  - thread entities
  - turns/items đã materialize cho UI
  - draft input
  - pending approval requests
  - request/stream errors
- Các action tối thiểu:
  - connect server
  - start thread for project
  - resume thread
  - send turn input
  - interrupt turn
  - accept/decline approval
  - hydrate persisted Codex session
  - persist Codex session

### 4. UI structure for the new column
- Cột phải mới nên có 3 vùng:
  - top bar: connection state, thread title, action buttons
  - body: thread list hoặc active conversation timeline
  - composer/footer: text area, send button, interrupt button, context hints
- Timeline cần render tối thiểu các item types:
  - user message
  - agent message với delta streaming
  - reasoning summary hoặc status item
  - shell command item
  - file change item
  - approval prompt
  - error/failure item
- Nếu cần thread switcher giống extension:
  - dùng một sidebar nhỏ bên trong Codex column hoặc dropdown/list overlay
  - không nên thay đổi header project tabs hiện tại ở phase đầu

### 5. Workspace integration
- Mapping project -> Codex context:
  - dùng `project.rootPath` làm `cwd` khi gọi `thread/start` hoặc `turn/start`
  - giữ active thread riêng cho từng project
- Khi đổi project tab:
  - UI chuyển sang active Codex thread của project đó
  - nếu project chưa có thread, hiển thị empty state và nút `Start Thread`
- Layout thay đổi ở [src/components/Workspace.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Workspace.tsx):
  - thay terminal aside bằng Codex aside
  - có thể giữ terminal như tool phụ trong phase sau bằng tabbed panel hoặc bottom drawer

### 6. Persistence
- Mở rộng session persistence hiện có để lưu thêm:
  - active thread id theo project
  - thread ids đã biết theo project
  - UI widths nếu cột mới có resizable width
  - draft input chưa gửi nếu muốn UX tốt hơn
- Không persist raw server event stream hoặc pending approvals chưa resolve.
- Lịch sử conversation chuẩn vẫn lấy lại từ app-server qua `thread/read` hoặc `thread/resume`, không sao chép hết vào workspace session file.

## Data Model Proposal
- `CodexConnectionState`
  - `status: 'idle' | 'starting' | 'ready' | 'failed'`
  - `error: string | null`
  - `serverPath?: string`
- `ProjectCodexState`
  - `projectId: string`
  - `threadIds: string[]`
  - `activeThreadId: string | null`
  - `draftInput: string`
- `CodexThreadEntity`
  - `id: string`
  - `projectId: string`
  - `title: string | null`
  - `status: string`
  - `cwd: string | null`
  - `turnIds: string[]`
  - `lastLoadedAt: number`
- `CodexTurnEntity`
  - `id: string`
  - `threadId: string`
  - `status: 'pending' | 'inProgress' | 'completed' | 'interrupted' | 'failed'`
  - `itemIds: string[]`
  - `usage?: { inputTokens?: number; outputTokens?: number }`
- `CodexItemEntity`
  - `id: string`
  - `threadId: string`
  - `turnId: string | null`
  - `kind: 'user' | 'agent' | 'reasoning' | 'command' | 'fileChange' | 'toolCall' | 'approval' | 'error' | 'status'`
  - `status: 'pending' | 'inProgress' | 'completed' | 'failed'`
  - `text?: string`
  - `raw?: unknown`
- `PendingServerRequest`
  - `requestId: string | number`
  - `threadId: string`
  - `turnId: string | null`
  - `kind: 'commandApproval' | 'fileChangeApproval' | 'permissionsApproval' | 'userInput' | 'mcpElicitation'`
  - `payload: unknown`

## Execution Plan
- [ ] Task 1: Define Codex protocol types and IPC surface
  - Thêm module shared mới cho app-server payloads, renderer event envelopes và approval decisions.
  - Mở rộng preload/global types với API riêng cho Codex thay vì nhồi vào PTY API hiện tại.
  - Chuẩn hóa channel names cho:
    - connection status updates
    - JSON-RPC notifications
    - server-initiated requests

- [ ] Task 2: Build Electron app-server process manager
  - Tạo module mới ví dụ `electron/codexAppServer.ts`.
  - Spawn `codex app-server` bằng `child_process.spawn`.
  - Parse stdout theo message boundary an toàn cho JSON-RPC stream.
  - Quản lý request id map để correlate request/response.
  - Forward notification và server request sang renderer qua `webContents.send`.
  - Bắt stderr/log/process exit và surface lỗi rõ ràng.

- [ ] Task 3: Add Electron IPC handlers for high-level Codex actions
  - Expose command-level methods:
    - `codex:connect`
    - `codex:thread-start`
    - `codex:thread-resume`
    - `codex:thread-list`
    - `codex:turn-start`
    - `codex:turn-interrupt`
    - `codex:server-request-resolve`
  - Ẩn JSON-RPC details khỏi renderer ở mức vừa phải để UI code không bị nhiễu bởi transport.
  - Cho phép restart server khi process fail.

- [ ] Task 4: Design Zustand Codex store slice
  - Tạo state shape cho connection, threads, turns, items, pending requests.
  - Xây reducers/action handlers cho streaming delta:
    - append `agentMessage` delta vào item đang mở
    - update status khi `item/completed` hoặc `turn/completed`
  - Đảm bảo mapping giữa active project và active thread rõ ràng.

- [ ] Task 5: Hook renderer event bridge to store
  - Đăng ký listener một lần ở app bootstrap.
  - Chuyển notification từ Electron thành store updates.
  - Xử lý reconnection/resubscription sau khi server restart.
  - Bảo đảm cleanup listener đúng khi hot reload/dev.

- [ ] Task 6: Replace terminal panel with Codex column shell
  - Refactor [src/components/Workspace.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Workspace.tsx) để render `CodexPanel` thay cho `Terminal`.
  - Giữ resizable right column và tinh chỉnh min/max width cho nội dung hội thoại.
  - Tạo empty/loading/error states cho cột mới.

- [ ] Task 7: Build conversation timeline UI
  - Tạo các component:
    - `CodexPanel`
    - `CodexThreadList`
    - `CodexConversation`
    - `CodexComposer`
    - `CodexApprovalCard`
    - `CodexTimelineItem`
  - Hỗ trợ auto-scroll thông minh khi đang stream, nhưng không ép scroll nếu user đang đọc phần cũ.
  - Hiển thị distinction rõ giữa user, agent, command, approval, error.

- [ ] Task 8: Implement thread lifecycle UX
  - Với project chưa có thread, cung cấp nút `Start a Codex thread`.
  - Với project đã có thread, auto-resume active thread khi mở lại app.
  - Có thread switcher cơ bản để chuyển giữa các thread đã biết trong project.
  - Phase đầu chưa cần archive/fork UI, nhưng data model nên chừa chỗ cho chúng.

- [ ] Task 9: Implement turn send/interrupt flow
  - Composer gửi `turn/start` với `threadId`, input text và `cwd` từ project.
  - Disable send khi turn đang chạy nếu chưa hỗ trợ `turn/steer`.
  - Có nút `Interrupt` khi active turn in progress.
  - Surface failure states từ `turn/completed` status `failed` hoặc error notifications.

- [ ] Task 10: Implement approval flow
  - Render approval request inline trong conversation và/hoặc sticky footer state.
  - Cho phép `accept`, `decline`, `cancel`; `acceptForSession` nếu payload hỗ trợ.
  - Gửi response về Electron để trả lời server request đúng `requestId`.
  - Clear pending UI khi nhận `serverRequest/resolved`.

- [ ] Task 11: Persist Codex UI session
  - Mở rộng session schema hiện có hoặc tạo file session riêng cho Codex panel.
  - Lưu active thread id, known thread ids, panel width, draft input.
  - Hydrate lại state sau `workspace` restore để experience liền mạch theo project.

- [ ] Task 12: Add diagnostics and fallback UX
  - Nếu `codex` CLI không tồn tại, hiển thị error state với hướng dẫn rõ ràng.
  - Nếu `initialize` fail hoặc protocol mismatch, hiển thị lỗi recoverable và nút retry.
  - Log các event không support đầy đủ để tránh mất visibility khi protocol mở rộng.

- [ ] Task 13: Phase 2 follow-up items
  - thread list pagination/search/archive/fork/rename
  - `thread/read` để load lịch sử nhẹ mà không cần full resume
  - account/auth state UI
  - MCP server status/resource/tool calls
  - richer render cho file diff và command action cards
  - coexistence terminal + Codex bằng tabbed tool window

## Validation
- Manual check: mở project, kết nối `codex app-server`, start thread và thấy `thread/started`.
- Manual check: gửi prompt, nhận stream `item/agentMessage/delta`, timeline cập nhật dần từng chunk.
- Manual check: khi agent yêu cầu approval cho command/file change, UI hiện request và quyết định từ UI làm turn tiếp tục đúng hướng.
- Manual check: interrupt một turn đang chạy và xác nhận timeline kết thúc với trạng thái `interrupted`.
- Manual check: mở hai project, mỗi project có active thread riêng; đổi tab project phải đổi đúng conversation context.
- Manual check: restart app và xác nhận active thread mapping theo project được restore.
- Manual check: tắt hoặc gỡ `codex` CLI, app phải hiển thị lỗi chẩn đoán thay vì treo panel.
- Manual check: kill app-server process giữa chừng, UI phản ánh disconnected/failed state và có thể reconnect.

## Risks
- Khó nhất là parser/transport cho JSON-RPC streaming nếu stdout framing không được xử lý cẩn thận.
- Approval flow là server-initiated request nên khác mô hình event listener hiện tại; nếu model hóa sai sẽ dễ deadlock turn.
- Nếu renderer giữ quá nhiều raw item data, performance timeline sẽ giảm khi thread dài.
- app-server protocol còn mở rộng nhanh; nếu type layer quá cứng sẽ khó theo kịp thay đổi.
- Thay terminal bằng Codex ngay từ đầu ảnh hưởng workflow cũ; nên cân nhắc chiến lược fallback hoặc tabbed panel sớm.

## Suggested Implementation Order
1. Shared types + Electron app-server manager
2. IPC bridge + renderer bootstrap connect
3. Zustand Codex slice + event reducers
4. `CodexPanel` shell và thay layout
5. Thread start/resume + turn send
6. Streaming timeline rendering
7. Approval flow
8. Persistence + reconnect/failure handling
9. Phase 2 extension features

## Open Questions
- Cột mới có thay thế hoàn toàn `Terminal` ở phase đầu hay cần giữ terminal dưới dạng tab trong cùng panel?
  Proposed default: thay terminal bằng Codex column trước để giảm phạm vi.
- Bạn muốn target “giống Codex extension” ở mức nào trong đợt đầu?
  Proposed default: thread + turn + stream + approval + basic history switcher, chưa làm auth/MCP/archive UI.
- Có muốn app quản lý cả login/account status của Codex ngay trong UI không?
  Proposed default: chưa, chỉ hiển thị lỗi từ app-server nếu chưa auth.

## Notes
- Nếu sau đó chuyển sang implementation, nên bắt đầu bằng một spike rất nhỏ:
  - spawn được `codex app-server`
  - gọi `initialize`
  - `thread/start`
  - `turn/start`
  - log toàn bộ notifications ra console renderer
- Spike này sẽ loại bỏ rủi ro lớn nhất trước khi dựng full UI.
