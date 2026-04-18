import { useEffect, useMemo, useState } from 'react';
import { useCodexStore } from '../store/codexStore';
import { useWorkspaceStore } from '../store/store';
import { ArrowExpandIcon, CloseIcon } from './FileTreeAssetIcons';

type WorkspaceSidebarProps = {
  projectId: string;
};

function getTaskLabel(task: { name?: string | null; title?: string | null; preview?: string }): string {
  return task.title || task.name || task.preview || 'Untitled chat';
}

function formatTaskTime(timestamp?: number): string {
  if (!timestamp) {
    return 'No activity';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function WorkspaceSidebar({ projectId }: WorkspaceSidebarProps) {
  const projectIds = useWorkspaceStore((state) => state.projectIds);
  const projects = useWorkspaceStore((state) => state.projects);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const openProject = useWorkspaceStore((state) => state.openProject);
  const closeProject = useWorkspaceStore((state) => state.closeProject);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const isOpeningProject = useWorkspaceStore((state) => state.isOpeningProject);
  const projectStates = useCodexStore((state) => state.projectStates);
  const selectThread = useCodexStore((state) => state.selectThread);
  const newChat = useCodexStore((state) => state.newChat);
  const loadProjectThreads = useCodexStore((state) => state.loadProjectThreads);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set(projectIds));
  const [menuThreadId, setMenuThreadId] = useState<string | null>(null);

  const toggleProject = (id: string) => {
    setExpandedProjects((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  useEffect(() => {
    for (const id of projectIds) {
      const workspace = projects[id];

      if (!workspace) {
        continue;
      }

      void loadProjectThreads({ projectId: id, rootPath: workspace.rootPath });
    }
  }, [loadProjectThreads, projectIds, projects]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f6f9]">
      <div className="border-b border-[#d8dde6] px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6c7686]">Workspaces</div>
            <div className="mt-1 text-[12px] text-[#8691a2]">{projectIds.length} open</div>
          </div>
          <button
            type="button"
            onClick={() => {
              void openProject();
            }}
            className="h-8 shrink-0 border border-[#c6ced9] bg-white px-3 text-[12px] font-medium text-[#2a313c] transition hover:bg-[#f8fafc]"
          >
            {isOpeningProject ? 'Opening...' : 'Open'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="px-2 py-2">
          <div className="mb-2 border-b border-[#d8dde6] px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6c7686]">
            Workspace Tree
          </div>

          <div className="space-y-1">
            {projectIds.map((id) => {
              const project = projects[id];
              const isActiveProject = id === activeProjectId;
              const isExpanded = expandedProjects.has(id);
              const activeThreadId = projectStates[id]?.threadId ?? null;
              const orderedThreads = projectStates[id]?.threadSummaries ?? [];
              const isLoadingHistory = projectStates[id]?.isLoadingHistory ?? false;

              if (!project) {
                return null;
              }

              return (
                <div key={id} className="space-y-1">
                  <div
                    className={[
                      'group flex items-start gap-2 px-2 py-2 transition',
                      isActiveProject ? 'bg-[#e9eef6] text-[#1f2329]' : 'text-[#596272] hover:bg-[#eef2f7]',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => toggleProject(id)}
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center"
                      aria-label={isExpanded ? 'Collapse workspace' : 'Expand workspace'}
                    >
                      <ArrowExpandIcon expanded={isExpanded} className="h-3 w-3 opacity-70" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProject(id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-[12px] font-medium">{project.name}</div>
                    </button>

                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        void closeProject(id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          void closeProject(id);
                        }
                      }}
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center opacity-45 transition hover:opacity-100"
                    >
                      <CloseIcon />
                    </span>
                  </div>

                  {isExpanded ? (
                    <div className="ml-4 pl-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 px-2 py-1">
                          <div className="text-[11px] uppercase tracking-[0.08em] text-[#8a94a4]">
                            {isLoadingHistory ? 'Loading chats...' : `${orderedThreads.length} chats`}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveProject(id);
                              newChat(id);
                            }}
                            className="h-7 border border-[#c6ced9] bg-white px-2 text-[11px] font-medium text-[#2a313c] transition hover:bg-[#f8fafc]"
                          >
                            New
                          </button>
                        </div>

                        {orderedThreads.map((thread) => {
                          const isActiveThread = isActiveProject && thread.id === activeThreadId;
                          const isProcessing =
                            isActiveProject &&
                            thread.id === activeThreadId &&
                            Boolean(projectStates[id]?.activeTurnId || projectStates[id]?.isSending);

                          return (
                            <div
                              key={thread.id}
                              className={[
                                'group relative flex items-start gap-2 rounded-md px-2 py-2 transition',
                                isActiveThread
                                  ? 'bg-white text-[#1f2329] shadow-[inset_0_0_0_1px_#d9e1eb]'
                                  : 'text-[#596272] hover:bg-[#eef2f7]',
                              ].join(' ')}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveProject(id);
                                  void selectThread({ projectId: id, threadId: thread.id });
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="truncate text-[12px] font-medium">{getTaskLabel(thread)}</div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8a94a4]">
                                  {isProcessing ? (
                                    <>
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#1f78d1]" />
                                      <span>Processing</span>
                                    </>
                                  ) : null}
                                  <span>{formatTaskTime(thread.updatedAt ?? thread.createdAt)}</span>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setMenuThreadId((current) => (current === thread.id ? null : thread.id))}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#8a94a4] opacity-0 transition hover:bg-[#e7ecf3] hover:text-[#4f5968] group-hover:opacity-100"
                              >
                                ...
                              </button>
                              {menuThreadId === thread.id ? (
                                <div className="absolute right-2 top-8 z-10 w-32 overflow-hidden rounded-lg border border-[#dbe1e8] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
                                  <button
                                    type="button"
                                    disabled
                                    className="block w-full px-3 py-2 text-left text-[12px] text-[#9aa3af] disabled:cursor-not-allowed"
                                  >
                                    Rename
                                  </button>
                                  <button
                                    type="button"
                                    disabled
                                    className="block w-full border-t border-[#eef2f6] px-3 py-2 text-left text-[12px] text-[#9aa3af] disabled:cursor-not-allowed"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
