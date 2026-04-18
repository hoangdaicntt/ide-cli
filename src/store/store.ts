import { create } from 'zustand';
import type {
  DirectoryNode,
  FileNode,
  PersistedProjectSession,
  TerminalExitPayload,
  TerminalMeta,
  WorkspaceSession,
} from '../shared/ipc';

export type EditorTab = {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
};

export type ProjectWorkspace = {
  id: string;
  name: string;
  rootPath: string;
  tree: DirectoryNode[];
  openFiles: Record<string, EditorTab>;
  activeFilePath: string | null;
  terminal: TerminalMeta | null;
  terminalStatus: 'idle' | 'running' | 'exited';
};

type WorkspaceStore = {
  projectIds: string[];
  projects: Record<string, ProjectWorkspace>;
  activeProjectId: string | null;
  isOpeningProject: boolean;
  hasHydratedWorkspace: boolean;
  openProject: () => Promise<void>;
  closeProject: (projectId: string) => Promise<void>;
  setActiveProject: (projectId: string) => void;
  setActiveFile: (projectId: string, filePath: string) => void;
  closeFile: (projectId: string, filePath: string) => void;
  openFile: (projectId: string, file: FileNode) => Promise<void>;
  updateFileContent: (projectId: string, filePath: string, content: string) => void;
  ensureTerminal: (projectId: string) => Promise<TerminalMeta | null>;
  handleTerminalExit: (payload: TerminalExitPayload) => void;
  hydrateWorkspace: () => Promise<void>;
};

const terminalRequests = new Map<string, Promise<TerminalMeta>>();
let workspaceHydrationPromise: Promise<void> | null = null;
let workspacePersistenceInitialized = false;

function getNameFromPath(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const segments = normalizedPath.split('/');
  return segments[segments.length - 1] ?? filePath;
}

function getProjectId(rootPath: string): string {
  return rootPath;
}

function getProjectName(rootPath: string): string {
  const normalizedPath = rootPath.replace(/\\/g, '/');
  const segments = normalizedPath.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? rootPath;
}

function createProjectWorkspace(input: {
  id: string;
  name: string;
  rootPath: string;
  tree: DirectoryNode[];
  openFiles?: Record<string, EditorTab>;
  activeFilePath?: string | null;
  terminalStatus?: ProjectWorkspace['terminalStatus'];
}): ProjectWorkspace {
  return {
    id: input.id,
    name: input.name,
    rootPath: input.rootPath,
    tree: input.tree,
    openFiles: input.openFiles ?? {},
    activeFilePath: input.activeFilePath ?? null,
    terminal: null,
    terminalStatus: input.terminalStatus ?? 'idle',
  };
}

function buildPersistedProjectSession(project: ProjectWorkspace): PersistedProjectSession {
  return {
    id: project.id,
    name: project.name,
    rootPath: project.rootPath,
    activeFilePath: project.activeFilePath,
    openFilePaths: Object.keys(project.openFiles),
    hasOpenTerminal: Boolean(project.terminal) || project.terminalStatus === 'running',
  };
}

function buildWorkspaceSession(state: Pick<WorkspaceStore, 'projectIds' | 'projects' | 'activeProjectId'>): WorkspaceSession {
  return {
    version: 1,
    activeProjectId: state.activeProjectId,
    projects: state.projectIds
      .map((projectId) => state.projects[projectId])
      .filter((project): project is ProjectWorkspace => Boolean(project))
      .map((project) => buildPersistedProjectSession(project)),
  };
}

async function restoreProjectSession(projectSession: PersistedProjectSession): Promise<ProjectWorkspace | null> {
  const rootPathExists = await window.electronAPI.pathExists(projectSession.rootPath);

  if (!rootPathExists) {
    console.warn(`[workspace:hydrate] Skipping missing project root: ${projectSession.rootPath}`);
    return null;
  }

  const tree = await window.electronAPI.readDirectory(projectSession.rootPath);
  const openFilesEntries: Record<string, EditorTab> = {};

  for (const filePath of projectSession.openFilePaths) {
    const fileExists = await window.electronAPI.pathExists(filePath);

    if (!fileExists) {
      console.warn(`[workspace:hydrate] Skipping missing file: ${filePath}`);
      continue;
    }

    try {
      const content = await window.electronAPI.readFile(filePath);

      openFilesEntries[filePath] = {
        path: filePath,
        name: getNameFromPath(filePath),
        content,
        isDirty: false,
      };
    } catch (error) {
      console.warn(`[workspace:hydrate] Failed to restore file: ${filePath}`, error);
    }
  }

  const activeFilePath =
    projectSession.activeFilePath && openFilesEntries[projectSession.activeFilePath]
      ? projectSession.activeFilePath
      : Object.keys(openFilesEntries)[0] ?? null;

  return createProjectWorkspace({
    id: projectSession.id,
    name: projectSession.name || getProjectName(projectSession.rootPath),
    rootPath: projectSession.rootPath,
    tree,
    openFiles: openFilesEntries,
    activeFilePath,
    terminalStatus: projectSession.hasOpenTerminal ? 'idle' : 'idle',
  });
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  projectIds: [],
  projects: {},
  activeProjectId: null,
  isOpeningProject: false,
  hasHydratedWorkspace: false,

  openProject: async () => {
    if (get().isOpeningProject) {
      return;
    }

    set({ isOpeningProject: true });

    try {
      const selectedPath = await window.electronAPI.openProjectDirectory();

      if (!selectedPath) {
        return;
      }

      const projectId = getProjectId(selectedPath);
      const existingProject = get().projects[projectId];

      if (existingProject) {
        set({ activeProjectId: projectId });
        return;
      }

      const tree = await window.electronAPI.readDirectory(selectedPath);

      set((state) => ({
        projectIds: [...state.projectIds, projectId],
        activeProjectId: projectId,
        projects: {
          ...state.projects,
          [projectId]: createProjectWorkspace({
            id: projectId,
            name: getProjectName(selectedPath),
            rootPath: selectedPath,
            tree,
          }),
        },
      }));
    } finally {
      set({ isOpeningProject: false });
    }
  },

  setActiveProject: (projectId: string) => {
    set({ activeProjectId: projectId });
  },

  setActiveFile: (projectId, filePath) => {
    set((state) => {
      const project = state.projects[projectId];

      if (!project?.openFiles[filePath]) {
        return state;
      }

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            activeFilePath: filePath,
          },
        },
      };
    });
  },

  closeFile: (projectId, filePath) => {
    set((state) => {
      const project = state.projects[projectId];

      if (!project?.openFiles[filePath]) {
        return state;
      }

      const nextOpenFiles = { ...project.openFiles };
      delete nextOpenFiles[filePath];
      const nextPaths = Object.keys(nextOpenFiles);

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            openFiles: nextOpenFiles,
            activeFilePath:
              project.activeFilePath === filePath ? nextPaths[nextPaths.length - 1] ?? null : project.activeFilePath,
          },
        },
      };
    });
  },

  closeProject: async (projectId: string) => {
    const project = get().projects[projectId];

    terminalRequests.delete(projectId);

    if (project?.terminal?.terminalId) {
      await window.electronAPI.killTerminal(project.terminal.terminalId);
    }

    set((state) => {
      const nextProjects = { ...state.projects };
      delete nextProjects[projectId];

      const nextProjectIds = state.projectIds.filter((id) => id !== projectId);
      const nextActiveProjectId =
        state.activeProjectId === projectId ? nextProjectIds[nextProjectIds.length - 1] ?? null : state.activeProjectId;

      return {
        projectIds: nextProjectIds,
        projects: nextProjects,
        activeProjectId: nextActiveProjectId,
      };
    });
  },

  openFile: async (projectId: string, file: FileNode) => {
    const existing = get().projects[projectId]?.openFiles[file.path];

    if (existing) {
      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            activeFilePath: file.path,
          },
        },
      }));
      return;
    }

    const content = await window.electronAPI.readFile(file.path);

    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          activeFilePath: file.path,
          openFiles: {
            ...state.projects[projectId].openFiles,
            [file.path]: {
              path: file.path,
              name: file.name,
              content,
              isDirty: false,
            },
          },
        },
      },
    }));
  },

  updateFileContent: (projectId: string, filePath: string, content: string) => {
    set((state) => {
      const project = state.projects[projectId];
      const current = project?.openFiles[filePath];

      if (!project || !current) {
        return state;
      }

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            openFiles: {
              ...project.openFiles,
              [filePath]: {
                ...current,
                content,
                isDirty: true,
              },
            },
          },
        },
      };
    });
  },

  ensureTerminal: async (projectId: string) => {
    const project = get().projects[projectId];

    if (!project) {
      return null;
    }

    if (project.terminal) {
      return project.terminal;
    }

    const pendingRequest = terminalRequests.get(projectId);

    if (pendingRequest) {
      return pendingRequest;
    }

    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          terminalStatus: 'running',
        },
      },
    }));

    const request = window.electronAPI
      .createTerminal({
        projectId,
        cwd: project.rootPath,
      })
      .then((terminal) => {
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              terminal,
              terminalStatus: 'running',
            },
          },
        }));

        return terminal;
      })
      .finally(() => {
        terminalRequests.delete(projectId);
      });

    terminalRequests.set(projectId, request);

    return request;
  },

  handleTerminalExit: (payload: TerminalExitPayload) => {
    terminalRequests.delete(payload.projectId);

    set((state) => {
      const project = state.projects[payload.projectId];

      if (!project) {
        return state;
      }

      return {
        projects: {
          ...state.projects,
          [payload.projectId]: {
            ...project,
            terminalStatus: 'exited',
            terminal:
              project.terminal?.terminalId === payload.terminalId ? null : project.terminal,
          },
        },
      };
    });
  },

  hydrateWorkspace: async () => {
    if (get().hasHydratedWorkspace) {
      return;
    }

    if (workspaceHydrationPromise) {
      return workspaceHydrationPromise;
    }

    workspaceHydrationPromise = (async () => {
      const session = await window.electronAPI.loadSession();

      if (!session || session.projects.length === 0) {
        set({ hasHydratedWorkspace: true });
        return;
      }

      const restoredProjectEntries = await Promise.all(
        session.projects.map(async (projectSession) => {
          const restoredProject = await restoreProjectSession(projectSession);
          return restoredProject ? ([projectSession.id, restoredProject] as const) : null;
        }),
      );

      const validProjectEntries = restoredProjectEntries.filter(
        (entry): entry is readonly [string, ProjectWorkspace] => Boolean(entry),
      );
      const projects = Object.fromEntries(validProjectEntries);
      const projectIds = validProjectEntries.map(([projectId]) => projectId);
      const activeProjectId =
        session.activeProjectId && projects[session.activeProjectId]
          ? session.activeProjectId
          : projectIds[0] ?? null;

      set({
        projects,
        projectIds,
        activeProjectId,
      });

      await Promise.all(
        session.projects
          .filter((projectSession) => projectSession.hasOpenTerminal && projects[projectSession.id])
          .map(async (projectSession) => {
            await get().ensureTerminal(projectSession.id);
          }),
      );

      set({ hasHydratedWorkspace: true });
    })()
      .catch((error) => {
        console.error('[workspace:hydrate] Failed to restore session.', error);
        set({ hasHydratedWorkspace: true });
      })
      .finally(() => {
        workspaceHydrationPromise = null;
      });

    return workspaceHydrationPromise;
  },
}));

export function initializeWorkspacePersistence(): void {
  if (workspacePersistenceInitialized) {
    return;
  }

  workspacePersistenceInitialized = true;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastSerializedSession = '';

  useWorkspaceStore.subscribe((state) => {
    if (!state.hasHydratedWorkspace) {
      return;
    }

    const session = buildWorkspaceSession(state);
    const serializedSession = JSON.stringify(session);

    if (serializedSession === lastSerializedSession) {
      return;
    }

    lastSerializedSession = serializedSession;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      void window.electronAPI.saveSession(session).catch((error) => {
        console.error('[workspace:save] Failed to persist workspace session.', error);
      });
    }, 250);
  });
}

export function getActiveProject(state: WorkspaceStore): ProjectWorkspace | null {
  return state.activeProjectId ? state.projects[state.activeProjectId] ?? null : null;
}

export function getActiveEditorTab(project: ProjectWorkspace | null): EditorTab | null {
  if (!project?.activeFilePath) {
    return null;
  }

  return project.openFiles[project.activeFilePath] ?? null;
}

export function flattenFiles(nodes: Array<DirectoryNode | FileNode>): FileNode[] {
  const files: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      files.push(node);
      continue;
    }

    files.push(...flattenFiles(node.children));
  }

  return files;
}

export function getDisplayNameFromPath(filePath: string): string {
  return getNameFromPath(filePath);
}

export function getRelativePath(rootPath: string, targetPath: string): string {
  const normalizedRoot = rootPath.replace(/\\/g, '/');
  const normalizedTarget = targetPath.replace(/\\/g, '/');

  if (normalizedTarget.startsWith(`${normalizedRoot}/`)) {
    return normalizedTarget.slice(normalizedRoot.length + 1);
  }

  return targetPath;
}
