import { useEffect, useState } from 'react';
import { Editor } from './Editor';
import { FileTree } from './FileTree';
import { Terminal } from './Terminal';
import type { ProjectWorkspace } from '../store/store';

type WorkspaceProps = {
  project: ProjectWorkspace;
};

type ResizeTarget = 'left' | 'right' | null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function Workspace({ project }: WorkspaceProps) {
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(420);
  const [resizing, setResizing] = useState<ResizeTarget>(null);

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      if (resizing === 'left') {
        setLeftWidth(clamp(event.clientX - 8, 220, 420));
        return;
      }

      setRightWidth(clamp(window.innerWidth - event.clientX - 8, 320, 640));
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

  return (
    <section className="h-full">
      <div className="flex h-full min-h-0 overflow-hidden">
        <aside
          className="min-h-0 border-r border-white/6 bg-white/[0.025]"
          style={{ width: leftWidth }}
        >
          <FileTree
            projectId={project.id}
            nodes={project.tree}
            activeFilePath={project.activeFilePath}
          />
        </aside>

        <button
          type="button"
          aria-label="Resize file explorer"
          onMouseDown={() => setResizing('left')}
          className="w-1.5 cursor-col-resize bg-transparent transition hover:bg-sky-400/40"
        />

        <main className="min-w-0 flex-1">
          <Editor projectId={project.id} />
        </main>

        <button
          type="button"
          aria-label="Resize terminal panel"
          onMouseDown={() => setResizing('right')}
          className="w-1.5 cursor-col-resize bg-transparent transition hover:bg-sky-400/40"
        />

        <aside
          className="min-h-0 border-l border-white/6 bg-white/[0.025]"
          style={{ width: rightWidth }}
        >
          <Terminal projectId={project.id} />
        </aside>
      </div>
    </section>
  );
}
