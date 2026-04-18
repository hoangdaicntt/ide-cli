import { useEffect } from 'react';
import { TerminalAssetIcon } from './components/FileTreeAssetIcons';
import { Workspace } from './components/Workspace';
import { initializeCodexEventBindings, initializeCodexPersistence, useCodexStore } from './store/codexStore';
import { initializeWorkspacePersistence, useWorkspaceStore } from './store/store';

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-[#f5f7fa] px-8">
      <div className="max-w-2xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-[#cfd6e0] bg-white">
          <TerminalAssetIcon className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#1f2329]">Open a project to start working.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#687384]">
          The workspace is organized with workspaces and tasks on the left, Codex beside it, the editor and terminal in the
          middle, and files on the right.
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
  const hasHydratedWorkspace = useWorkspaceStore((state) => state.hasHydratedWorkspace);
  const hydrateWorkspace = useWorkspaceStore((state) => state.hydrateWorkspace);
  const initializeCodex = useCodexStore((state) => state.initialize);

  const activeProject = activeProjectId ? projects[activeProjectId] ?? null : null;

  useEffect(() => {
    initializeWorkspacePersistence();
    initializeCodexEventBindings();
    initializeCodexPersistence();
    void hydrateWorkspace();
    void initializeCodex();
  }, [hydrateWorkspace, initializeCodex]);

  useEffect(() => {
    const dispose = window.electronAPI.onTerminalExit((payload) => {
      handleTerminalExit(payload);
    });

    return () => {
      dispose();
    };
  }, [handleTerminalExit]);

  if (!hasHydratedWorkspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fa] text-[#5f6b7a]">
        <div className="flex items-center gap-3 border border-[#cfd6e0] bg-white px-4 py-3 text-sm">
          <TerminalAssetIcon />
          <span>Restoring workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#dfe3ea] text-[#1f2329]">
      <div className="h-full overflow-hidden">
        {projectIds.length === 0 ? (
          <EmptyState />
        ) : activeProject ? (
          <Workspace project={activeProject} />
        ) : null}
      </div>
    </div>
  );
}
