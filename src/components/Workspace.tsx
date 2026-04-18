import { useEffect, useState } from 'react';
import { ActivityBar } from './ActivityBar';
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

const ACTIVITY_BAR_WIDTH = 40;
const SPLITTER_SIZE = 5;

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
        setFilesWidth(clamp(window.innerWidth - event.clientX - ACTIVITY_BAR_WIDTH - 8, 220, 360));
        return;
      }

      if (resizing === 'codex') {
        const availableWidth = window.innerWidth - sidebarWidth - filesWidth - ACTIVITY_BAR_WIDTH - SPLITTER_SIZE * 3;
        const nextCodexWidth = event.clientX - sidebarWidth - SPLITTER_SIZE;

        setCodexWidth(clamp(nextCodexWidth, 320, Math.max(320, availableWidth - 360)));
        return;
      }

      const nextEditorHeight = event.clientY - SPLITTER_SIZE;
      setEditorHeight(clamp(nextEditorHeight, 180, Math.max(180, window.innerHeight - 220)));
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
    const availableWidth = Math.max(
      window.innerWidth - sidebarWidth - filesWidth - ACTIVITY_BAR_WIDTH - SPLITTER_SIZE * 3,
      680,
    );

    setCodexWidth((current) => {
      if (current > 0) {
        return clamp(current, 320, Math.max(320, availableWidth - 360));
      }

      return Math.max(320, Math.floor(availableWidth / 2));
    });
  }, [filesWidth, sidebarWidth]);

  useEffect(() => {
    setEditorHeight((current) => {
      const availableHeight = Math.max(window.innerHeight - SPLITTER_SIZE, 480);

      if (current > 0) {
        return clamp(current, 180, availableHeight - 180);
      }

      return Math.floor(availableHeight / 2);
    });
  }, []);

  return (
    <section className="h-full">
      <div className="flex h-full min-h-0 overflow-hidden bg-[var(--shell-canvas)]">
        <aside
          className="min-h-0 border-r border-[var(--shell-border)] bg-[var(--panel-muted-bg)]"
          style={{ width: sidebarWidth }}
        >
          <WorkspaceSidebar projectId={project.id} />
        </aside>

        <button
          type="button"
          aria-label="Resize workspace sidebar"
          onMouseDown={() => setResizing('sidebar')}
          className="panel-resize-handle"
        />

        <aside
          className="min-h-0 border-r border-[var(--shell-border)] bg-[var(--panel-bg)]"
          style={{ width: codexWidth }}
        >
          <CodexPanel projectId={project.id} rootPath={project.rootPath} tree={project.tree} />
        </aside>

        <button
          type="button"
          aria-label="Resize Codex panel"
          onMouseDown={() => setResizing('codex')}
          className="panel-resize-handle"
        />

        <main className="min-w-0 flex-1 bg-[var(--panel-bg)]">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="min-h-0" style={{ height: editorHeight }}>
              <Editor projectId={project.id} />
            </div>

            <button
              type="button"
              aria-label="Resize editor and terminal"
              onMouseDown={() => setResizing('editor-terminal')}
              className="panel-resize-handle-horizontal"
            />

            <div className="min-h-0 flex-1 border-t border-[var(--shell-border)]">
              <Terminal projectId={project.id} />
            </div>
          </div>
        </main>

        <button
          type="button"
          aria-label="Resize file tree"
          onMouseDown={() => setResizing('files')}
          className="panel-resize-handle"
        />

        <aside
          className="min-h-0 border-l border-[var(--shell-border)] bg-[var(--panel-muted-bg)]"
          style={{ width: filesWidth }}
        >
          <FileTree
            projectId={project.id}
            nodes={project.tree}
            activeFilePath={project.activeFilePath}
          />
        </aside>

        <ActivityBar />
      </div>
    </section>
  );
}
