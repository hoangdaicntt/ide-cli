import { useWorkspaceStore } from '../store/store';
import { CloseIcon } from './FileTreeAssetIcons';

export function HeaderTabs() {
  const projectIds = useWorkspaceStore((state) => state.projectIds);
  const projects = useWorkspaceStore((state) => state.projects);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const openProject = useWorkspaceStore((state) => state.openProject);
  const closeProject = useWorkspaceStore((state) => state.closeProject);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const isOpeningProject = useWorkspaceStore((state) => state.isOpeningProject);

  return (
    <header className="flex h-12 items-center gap-3 border-b border-[#c9ced8] bg-[#e9edf2] pl-[84px] pr-3">
      <div className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto self-end">
        {projectIds.map((projectId) => {
          const project = projects[projectId];
          const isActive = projectId === activeProjectId;

          return (
            <button
              key={projectId}
              type="button"
              onClick={() => setActiveProject(projectId)}
              className={[
                'group flex min-w-[180px] max-w-[260px] items-center gap-2 border border-b-0 px-3 py-2 text-left text-[12px] transition',
                isActive
                  ? 'border-[#c9ced8] bg-[#f7f9fc] text-[#1f2329]'
                  : 'border-transparent bg-[#dde3ea] text-[#596272] hover:bg-[#e3e8ef] hover:text-[#2a313c]',
              ].join(' ')}
            >
              <span
                className={[
                  'h-2 w-2 shrink-0 rounded-full',
                  isActive ? 'bg-[#4d9df7]' : 'bg-[#97a3b6]',
                ].join(' ')}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  void closeProject(projectId);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    void closeProject(projectId);
                  }
                }}
                className="flex h-4 w-4 shrink-0 items-center justify-center opacity-55 transition hover:opacity-100"
              >
                <CloseIcon />
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          void openProject();
        }}
        className="h-8 border border-[#bfc7d3] bg-[#f6f8fb] px-3 text-[12px] font-medium text-[#2a313c] transition hover:bg-white"
      >
        {isOpeningProject ? 'Opening...' : 'Open Project'}
      </button>
    </header>
  );
}
