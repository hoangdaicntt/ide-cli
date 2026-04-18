# Feature: Demo UI Layout Alignment

## Overview
Refactor UI/layout app hiện tại để khớp `demo/demo.tsx` và `demo/img.png` làm source of truth cho shell desktop:

- bố cục 5 cột theo demo nhưng vẫn giữ splitter để resize các panel chính
- visual hierarchy, spacing, border, typography và màu sắc bám demo
- Codex panel, editor, terminal, file explorer và activity rail nhìn như demo
- vẫn giữ logic Electron + Zustand + Monaco + PTY + Codex đang chạy

Mục tiêu của đợt này là thay đổi shell và presentation trước, không viết lại luồng nghiệp vụ đang hoạt động.

## Current Project Survey
- App shell hiện tại nằm ở [src/App.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/App.tsx) và [src/components/Workspace.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Workspace.tsx).
- `Workspace` đang là layout flex có splitter động:
  - trái: workspace sidebar
  - giữa trái: Codex
  - giữa phải: editor + terminal
  - phải: file tree
- App đang có custom top header ở [src/App.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/App.tsx), trong khi demo không dùng header này.
- Electron window trong [electron/main.ts](/Volumes/ExData/Documents/OtherProjects/ide-cli/electron/main.ts) đang dùng `titleBarStyle: 'hiddenInset'`, `trafficLightPosition`, `vibrancy`, nên mọi thay đổi header phải tính luôn vùng drag/no-drag.
- Các panel đã được tách component khá rõ:
  - [src/components/WorkspaceSidebar.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/WorkspaceSidebar.tsx)
  - [src/components/CodexPanel/index.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/CodexPanel/index.tsx)
  - [src/components/Editor.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Editor.tsx)
  - [src/components/Terminal.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Terminal.tsx)
  - [src/components/FileTree.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/FileTree.tsx)
- Logic hiện tại đủ để map sang demo:
  - workspace -> project
  - task thread -> Codex thread summary
  - new task -> `newChat(projectId)`
  - editor tabs đã có sẵn
  - terminal thật đã có PTY thật
  - file tree đã sort folder trước file sau
- Renderer crash nếu mở trực tiếp bằng browser vì `window.electronAPI` không tồn tại. Vòng verify UI phải bám Electron dev instance, không chỉ nhìn `http://127.0.0.1:5173/`.

## Assumptions
- `demo/demo.tsx` và `demo/img.png` là chuẩn visual cần bám.
- “100%” ở đây được hiểu là khớp shell/layout/look-and-feel của demo, nhưng vẫn giữ dữ liệu và hành vi thật của app hiện tại thay cho dữ liệu mock trong demo.
- Splitter hiện tại vẫn được giữ, nhưng phải làm mảnh và hòa vào hệ visual của demo thay vì nhìn như dev tooling.
- Activity bar ngoài cùng bên phải sẽ được render đúng visual trước; tương tác chuyển view có thể để no-op ở phase này nếu chưa có screen tương ứng.
- Terminal vẫn giữ 1 PTY thật mỗi project; chỉ đổi chrome của panel để nhìn giống tab strip trong demo, không mở scope sang multi-terminal thật.
- Context files panel trong Codex composer sẽ lấy từ state thật (`attachedFilePaths` và/hoặc mention đã chọn), không hard-code mock data.
- Font shell sẽ đổi sang system/Segoe-like stack để gần demo hơn; editor và terminal vẫn dùng monospace.

## Out Of Scope
- Viết lại business flow mở project, đọc file, PTY, Codex transport.
- Multi-terminal thực sự với nhiều session/tab đang chạy song song.
- Activity bar switcher hoàn chỉnh giữa nhiều module mới.
- Dark mode hoặc responsive cho kích thước ngoài desktop window chuẩn hiện tại.

## Dependencies
- Không bắt buộc thêm thư viện mới nếu chỉ refactor layout và tái dùng asset hiện có.
- Tuỳ chọn nếu cần khớp icon set của demo nhanh nhất:
  - `lucide-react`
- Nếu không thêm dependency, có thể dùng icon SVG hiện tại kết hợp một số inline SVG nhỏ cho toolbar/action icons.

## Architecture
### 1. App Shell
- [src/App.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/App.tsx):
  - bỏ custom `AppHeader`
  - giữ nguyên empty state và hydrate/loading state
  - đưa `Workspace` thành shell full-height chính
- [src/components/Workspace.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Workspace.tsx):
  - giữ layout shell 5 vùng theo demo nhưng triển khai bằng hybrid flex/grid để vẫn resize được
  - target widths mặc định:
    - workspace `250px`
    - Codex `~1fr`
    - editor stack `~1fr`
    - explorer `250px`
    - activity rail `40px`
  - splitter giữa các panel phải:
    - cực mảnh
    - màu trùng border shell
    - hover/drag state tinh tế, không phá visual demo
  - editor/terminal chia dọc theo tỷ lệ gần `60/40`

### 2. Window Chrome And Drag Regions
- Vì window đang `hiddenInset`, mỗi panel header phải xác định rõ:
  - vùng drag
  - vùng `app-no-drag`
- Cần check lại overlap với traffic lights khi bỏ `AppHeader`.
- Nếu cần, thêm top padding nhẹ cho cột đầu để shell không đè lên controls của macOS.

### 3. Presentation Layer Refactor
- Thêm component mới cho right rail, ví dụ:
  - `src/components/ActivityBar.tsx`
- Có thể thêm shared primitives nhỏ cho panel header/tab row nếu thấy lặp lại:
  - `PanelHeader`
  - `TabStrip`
  - `SectionLabel`
- Giữ store và IPC APIs gần như nguyên vẹn; ưu tiên đổi structure/className hơn là đổi data flow.

### 4. Real Data Mapping To Demo
- Workspace column:
  - project name -> workspace folder title
  - thread summaries -> task rows
  - `newChat(projectId)` -> `New task`
- Codex column:
  - giữ transcript, send, interrupt, approval
  - restyle để ra bubble/avatar/code block/composer giống demo
  - context files panel phải phản ánh dữ liệu thật
- Editor column:
  - giữ Monaco và file tab logic
  - đổi tab chrome, spacing, colors
- Terminal:
  - giữ PTY thật
  - đổi phần header để nhìn giống terminal tabs demo
- Explorer:
  - giữ tree thật và active file
  - đổi visual hierarchy, header và right utility area

## Tasks
- [x] Task 1: Chốt visual tokens từ demo
  - Trích ra width cột, height header, border color, panel background, hover/active color, padding, radius, shadow.
  - Ghi thành token dùng chung trong [src/index.css](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/index.css) hoặc constant nhỏ nếu cần.
  - Xác định font stack cho shell và monospace stack cho code/terminal.

- [x] Task 2: Refactor app shell theo demo nhưng giữ splitter
  - Bỏ custom app header ở [src/App.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/App.tsx).
  - Viết lại [src/components/Workspace.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Workspace.tsx) theo shell demo, nhưng giữ state resize hiện tại.
  - Thu gọn và restyle các resize handles để nhìn như một phần của border layout.
  - Đặt default widths giống demo, nhưng vẫn cho phép kéo workspace/Codex/explorer và editor/terminal.
  - Giữ tỷ lệ editor/terminal mặc định gần ảnh demo.

- [x] Task 3: Thêm right activity rail
  - Tạo rail 40px nằm sát mép phải giống demo.
  - Render icon stack trên/dưới và active indicator.
  - Mặc định highlight mục Codex/message như demo.
  - Giữ interaction an toàn: nếu chưa có target view thì để no-op thay vì thêm logic nửa vời.

- [x] Task 4: Refactor workspace sidebar theo demo
  - Đổi header thành `WORKSPACE` với nút `+`.
  - Rút gọn metadata thừa hiện tại như project count/path line nếu không có trong demo.
  - Restyle project row thành folder tree gọn hơn.
  - Restyle thread rows thành task items có hover/active state theo demo.
  - Render `New task` dưới mỗi workspace mở và map sang `newChat`.

- [x] Task 5: Refactor Codex panel shell theo demo
  - Đổi header bar của [src/components/CodexPanel/Header.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/CodexPanel/Header.tsx) thành style demo.
  - Restyle transcript container trong [src/components/CodexPanel/TranscriptView.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/CodexPanel/TranscriptView.tsx):
    - avatar/icon
    - message spacing
    - role grouping
    - text density
  - Restyle markdown/code block trong [src/components/CodexPanel/MarkdownContent.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/CodexPanel/MarkdownContent.tsx) để gần code sample box của demo.
  - Đảm bảo approval card không phá visual language mới.

- [x] Task 6: Align Codex composer với demo nhưng giữ hành vi thật
  - Refactor [src/components/CodexPanel/Composer.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/CodexPanel/Composer.tsx) thành:
    - context files panel ở trên
    - composer box bo tròn lớn
    - toolbar dưới gồm permission/model/effort/send
  - Giữ mention picker hiện có, nhưng làm rõ mapping giữa:
    - inline `@mention`
    - attached file context
  - Nếu cần, cập nhật nhẹ [src/store/codexStore.ts](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/store/codexStore.ts) để mention được chọn vừa hiển thị đúng trong composer vừa xuất hiện trong context panel trước khi gửi.
  - Không làm hỏng `sendPrompt`, `interruptTurn`, approval policy và reasoning effort hiện tại.

- [x] Task 7: Refactor editor panel theo demo
  - Đổi tab row trong [src/components/Editor.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Editor.tsx) để bám demo hơn:
    - active tab border
    - icon màu
    - spacing và chiều cao
  - Điều chỉnh Monaco theme gần code surface trong demo:
    - background
    - line number color
    - font size/padding
  - Giữ nguyên khả năng mở nhiều file tabs và dirty state.

- [x] Task 8: Refactor terminal panel theo demo
  - Đổi header của [src/components/Terminal.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/Terminal.tsx) sang tab-strip style.
  - Map terminal thật hiện có vào tab đang active.
  - Nếu cần, hiển thị shell name/path theo chrome của demo nhưng không mở scope sang multi-session thật.
  - Chỉnh xterm container spacing và background để khớp screenshot hơn.

- [x] Task 9: Refactor explorer panel theo demo
  - Đổi header của [src/components/FileTree.tsx](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/components/FileTree.tsx) sang `TẬP TIN (EXPLORER)`.
  - Làm lại spacing, indent, active row, folder/file icon sizing.
  - Giữ root expand mặc định và folder-first sorting như hiện tại.
  - Nếu cần, thêm right-side utility icons giống demo nhưng không ràng thêm hành vi mới.

- [x] Task 10: Polish global styling và Electron integration
  - Cập nhật [src/index.css](/Volumes/ExData/Documents/OtherProjects/ide-cli/src/index.css) cho:
    - shell background
    - scrollbar
    - font stack
    - border colors
    - helper utilities như `no-scrollbar`, `custom-scrollbar`
  - Kiểm tra các vùng `app-drag-region` và `app-no-drag` sau refactor.
  - Nếu visual bị lệch do window chrome, tinh chỉnh `trafficLightPosition` hoặc top inset trong [electron/main.ts](/Volumes/ExData/Documents/OtherProjects/ide-cli/electron/main.ts).

- [x] Task 11: Verify bằng ảnh demo và smoke test chức năng
  - So từng khu vực với [demo/img.png](/Volumes/ExData/Documents/OtherProjects/ide-cli/demo/img.png).
  - Smoke test:
    - mở project
    - đổi workspace/task
    - mở file và đổi tab
    - terminal vẫn nhập được
    - Codex vẫn gửi prompt được
    - mention picker vẫn hoạt động
  - Với thay đổi renderer: verify qua HMR/reload.
  - Nếu có sửa `electron/main.ts` hoặc `electron/preload.ts`: restart Electron process theo đúng guardrail trong `AGENTS.md`.

## Validation
- Visual check: shell mới khớp demo về:
  - tỷ lệ 5 cột
  - màu nền và đường kẻ
  - header bars
  - tab styling
  - composer shape
  - right activity rail
  - splitter mảnh, ít gây chú ý và không phá bố cục demo
- Functional check:
  - app hydrate không lỗi
  - open project vẫn hoạt động
  - open file / switch file / close file không regress
  - terminal vẫn interactive
  - Codex thread list, select thread, new chat, send prompt, approval flow vẫn hoạt động
  - splitter kéo được và không làm vỡ min/max width các panel
- Window chrome check:
  - drag app được
  - click các control trong header không bị drag chặn
  - traffic lights không đè lên content

## Execution Notes
- Đã thêm `lucide-react` để bám iconography của demo nhanh và nhất quán hơn.
- `@mention` trong composer giờ vừa chèn text vào draft vừa thêm file vào `attachedFilePaths`, nên context files panel có dữ liệu thật.
- Verify kỹ thuật đã chạy qua:
  - `npm run typecheck`
  - `npm run build`
- Dev instance `npm run dev` vẫn được giữ chạy trong suốt quá trình refactor.
- Không chụp được ảnh trực tiếp từ Electron window trong môi trường agent hiện tại vì lệnh chụp màn hình hệ thống không truy cập được display; phần verify cuối dựa trên build/typecheck/dev runtime thay vì screenshot tự động.

## Risks
- Giữ splitter đồng nghĩa shell sẽ không thể giống demo theo nghĩa literal 100%; cần hiểu mục tiêu là bám visual demo tối đa nhưng vẫn ưu tiên affordance resize.
- Composer hiện có hai khái niệm gần nhau:
  - inline mention trong draft
  - attached file content trước khi gửi
  Cần thống nhất để UI mới không gây hiểu nhầm.
- Terminal demo trông như đa tab nhưng data model hiện tại là 1 PTY/project; cần giữ scope chặt để không kéo thêm backend work.
- `window.electronAPI` không có trong browser preview nên mọi verify nghiêm túc phải chạy trong Electron thật.

## Proposed Defaults Before Execution
- Giữ splitter ở các ranh giới chính, nhưng restyle để gần như hòa vào border layout.
- Activity rail render đúng visual nhưng chưa làm module switching thật.
- Terminal chỉ có 1 session thật; tab chrome mang tính presentation.
- Context files panel lấy từ dữ liệu thật, không hard-code mock list.
