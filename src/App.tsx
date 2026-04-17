import { useEffect } from 'react';
import { HeaderTabs } from './components/HeaderTabs';
import { Workspace } from './components/Workspace';
import { useWorkspaceStore } from './store/store';

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06] shadow-panel">
          <span className="text-2xl text-white/90">⌘</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white/96">Multi-project workspace, native terminal, zero noise.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/46">
          Open a folder to create an isolated project workspace with its own file tree, editor state, and PTY-backed shell.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const projectIds = useWorkspaceStore((state) => state.projectIds);
  const projects = useWorkspaceStore((state) => state.projects);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const handleTerminalExit = useWorkspaceStore((state) => state.handleTerminalExit);

  const activeProject = activeProjectId ? projects[activeProjectId] ?? null : null;

  useEffect(() => {
    const dispose = window.electronAPI.onTerminalExit((payload) => {
      handleTerminalExit(payload);
    });

    return () => {
      dispose();
    };
  }, [handleTerminalExit]);

  return (
    <div className="h-screen overflow-hidden bg-[#0b0f14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.09),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_16%)]" />
      <div className="relative flex h-full flex-col">
        <HeaderTabs />
        <div className="min-h-0 flex-1 p-4 pt-3">
          <div className="h-full overflow-hidden rounded-[28px] border border-white/8 bg-[#0d1218]/92 shadow-panel backdrop-blur-xl">
            {projectIds.length === 0 ? (
              <EmptyState />
            ) : activeProject ? (
              <Workspace project={activeProject} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
