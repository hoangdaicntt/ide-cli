import { useEffect, useState } from 'react';
import { CodexPanel } from './CodexPanel/index';
import { Editor } from './Editor';
import { FileTree } from './FileTree';
import { Terminal } from './Terminal';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import type { ProjectWorkspace } from '../store/store';

type WorkspaceProps = {
  project: ProjectWorkspace;
};

type ResizeTarget = 'sidebar' | 'codex' | 'files' | 'editor-terminal' | null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function Workspace({ project }: WorkspaceProps) {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [codexWidth, setCodexWidth] = useState(0);
  const [filesWidth, setFilesWidth] = useState(250);
  const [editorHeight, setEditorHeight] = useState(0);
  const [resizing, setResizing] = useState<ResizeTarget>(null);

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      if (resizing === 'sidebar') {
        setSidebarWidth(clamp(event.clientX - 8, 220, 360));
        return;
      }

      if (resizing === 'files') {
        setFilesWidth(clamp(window.innerWidth - event.clientX - 8, 220, 360));
        return;
      }

      if (resizing === 'codex') {
        const availableWidth = window.innerWidth - sidebarWidth - filesWidth - 24;
        const nextCodexWidth = event.clientX - sidebarWidth - 4;

        setCodexWidth(clamp(nextCodexWidth, 320, Math.max(320, availableWidth - 320)));
        return;
      }

      const nextEditorHeight = event.clientY - 4;
      setEditorHeight(clamp(nextEditorHeight, 180, Math.max(180, window.innerHeight - 240)));
    };

    const handlePointerUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [resizing]);

  useEffect(() => {
    const availableWidth = Math.max(window.innerWidth - sidebarWidth - filesWidth - 24, 640);

    setCodexWidth((current) => {
      if (current > 0) {
        return clamp(current, 320, Math.max(320, availableWidth - 320));
      }

      return Math.max(320, Math.floor(availableWidth / 2));
    });
  }, [filesWidth, sidebarWidth]);

  useEffect(() => {
    setEditorHeight((current) => {
      const availableHeight = Math.max(window.innerHeight - 4, 480);

      if (current > 0) {
        return clamp(current, 180, availableHeight - 180);
      }

      return Math.floor(availableHeight / 2);
    });
  }, []);

  return (
    <section className="h-full">
      <div className="flex h-full min-h-0 overflow-hidden">
        <aside
          className="min-h-0 border-r border-[#d4dae3] bg-[#f5f7fa]"
          style={{ width: sidebarWidth }}
        >
          <WorkspaceSidebar projectId={project.id} />
        </aside>

        <button
          type="button"
          aria-label="Resize workspace sidebar"
          onMouseDown={() => setResizing('sidebar')}
          className="w-1 cursor-col-resize bg-[#d4dae3] transition hover:bg-[#9eb7d4]"
        />

        <aside
          className="min-h-0 border-r border-[#d4dae3] bg-[#fbfcfe]"
          style={{ width: codexWidth }}
        >
          <CodexPanel projectId={project.id} rootPath={project.rootPath} tree={project.tree} />
        </aside>

        <button
          type="button"
          aria-label="Resize Codex panel"
          onMouseDown={() => setResizing('codex')}
          className="w-1 cursor-col-resize bg-[#d4dae3] transition hover:bg-[#9eb7d4]"
        />

        <main className="min-w-0 flex-1 bg-white">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="min-h-0" style={{ height: editorHeight }}>
              <Editor projectId={project.id} />
            </div>

            <button
              type="button"
              aria-label="Resize editor and terminal"
              onMouseDown={() => setResizing('editor-terminal')}
              className="h-1 cursor-row-resize bg-[#d4dae3] transition hover:bg-[#9eb7d4]"
            />

            <div className="min-h-0 flex-1 border-t border-[#d4dae3]">
              <Terminal projectId={project.id} />
            </div>
          </div>
        </main>

        <button
          type="button"
          aria-label="Resize file tree"
          onMouseDown={() => setResizing('files')}
          className="w-1 cursor-col-resize bg-[#d4dae3] transition hover:bg-[#9eb7d4]"
        />

        <aside
          className="min-h-0 border-l border-[#d4dae3] bg-[#f5f7fa]"
          style={{ width: filesWidth }}
        >
          <FileTree
            projectId={project.id}
            nodes={project.tree}
            activeFilePath={project.activeFilePath}
          />
        </aside>
      </div>
    </section>
  );
}
