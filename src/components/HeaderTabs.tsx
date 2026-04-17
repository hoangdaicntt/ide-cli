import { useWorkspaceStore } from '../store/store';

export function HeaderTabs() {
  const projectIds = useWorkspaceStore((state) => state.projectIds);
  const projects = useWorkspaceStore((state) => state.projects);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const openProject = useWorkspaceStore((state) => state.openProject);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const isOpeningProject = useWorkspaceStore((state) => state.isOpeningProject);

  return (
    <header className="flex h-16 items-center gap-4 border-b border-white/6 bg-white/[0.035] px-24 backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {projectIds.map((projectId) => {
          const project = projects[projectId];
          const isActive = projectId === activeProjectId;

          return (
            <button
              key={projectId}
              type="button"
              onClick={() => setActiveProject(projectId)}
              className={[
                'group flex min-w-[180px] max-w-[260px] items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition',
                isActive
                  ? 'border-white/12 bg-white/12 text-white shadow-insetGlass'
                  : 'border-transparent bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white/90',
              ].join(' ')}
            >
              <span
                className={[
                  'h-2.5 w-2.5 rounded-full',
                  isActive ? 'bg-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.75)]' : 'bg-white/20',
                ].join(' ')}
              />
              <span className="truncate text-[13px] font-medium tracking-[0.01em]">{project.name}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          void openProject();
        }}
        className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium text-white/90 transition hover:border-white/20 hover:bg-white/[0.1]"
      >
        {isOpeningProject ? 'Opening...' : '+ Open Project'}
      </button>
    </header>
  );
}
