import { create } from "zustand";
import {
  type Task,
  type Project,
  type ProjectStage,
  type Plan,
  type LifeEvent,
  type Note,
  type ResearchTopic,
  type Subtopic,
  type Routine,
  type Transaction,
} from "./mock-data";
import {
  createEvent as createEventApi,
  createNote as createNoteApi,
  createPlan as createPlanApi,
  createProject as createProjectApi,
  createResearch as createResearchApi,
  createRoutine as createRoutineApi,
  createStage as createStageApi,
  createSubtopic as createSubtopicApi,
  createTask as createTaskApi,
  createTransaction as createTransactionApi,
  deleteEvent as deleteEventApi,
  deleteNote as deleteNoteApi,
  deletePlan as deletePlanApi,
  deleteProject as deleteProjectApi,
  deleteResearch as deleteResearchApi,
  deleteRoutine as deleteRoutineApi,
  deleteStage as deleteStageApi,
  deleteSubtopic as deleteSubtopicApi,
  deleteTask as deleteTaskApi,
  deleteTransaction as deleteTransactionApi,
  fetchEvents,
  fetchNotes,
  fetchPlans,
  fetchProjects,
  fetchResearch,
  fetchRoutines,
  fetchTasks,
  fetchTransactions,
  toggleRoutineCheckin,
  updateEvent as updateEventApi,
  updateNote as updateNoteApi,
  updatePlan as updatePlanApi,
  updateProject as updateProjectApi,
  updateResearch as updateResearchApi,
  updateStage as updateStageApi,
  updateSubtopic as updateSubtopicApi,
  updateTask as updateTaskApi,
  updateTransaction as updateTransactionApi,
} from "./api";

type Counters = {
  task: number;
  project: number;
  plan: number;
  event: number;
  note: number;
  research: number;
  routine: number;
  transaction: number;
};

interface State {
  tasks: Task[];
  projects: Project[];
  plans: Plan[];
  events: LifeEvent[];
  notes: Note[];
  research: ResearchTopic[];
  routines: Routine[];
  transactions: Transaction[];
  counters: Counters;
  isLoading: boolean;
  error?: string;
  loadData: () => Promise<void>;
  addTask: (task: Omit<Task, "id">) => Promise<Task>;
  updateTask: (id: number, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  toggleStep: (taskId: number, stepId: number) => Promise<void>;
  addProject: (
    project: Omit<Project, "id" | "stages" | "progress"> & {
      stages?: ProjectStage[];
      progress?: number;
    },
  ) => Promise<Project>;
  updateProject: (id: number, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  addStage: (projectId: number, name: string) => Promise<void>;
  updateStage: (projectId: number, stageId: number, patch: Partial<ProjectStage>) => Promise<void>;
  deleteStage: (projectId: number, stageId: number) => Promise<void>;
  toggleRoutine: (id: number) => Promise<void>;
  addRoutine: (name: string) => Promise<void>;
  deleteRoutine: (id: number) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, "id">) => Promise<Transaction>;
  updateTransaction: (
    id: number,
    patch: Partial<Transaction>,
    currentType?: Transaction["type"],
  ) => Promise<void>;
  deleteTransaction: (id: number, type?: Transaction["type"]) => Promise<void>;
  addPlan: (plan: Omit<Plan, "id">) => void;
  updatePlan: (id: number, patch: Partial<Plan>) => void;
  deletePlan: (id: number) => void;
  addEvent: (event: Omit<LifeEvent, "id">) => Promise<void>;
  updateEvent: (id: number, patch: Partial<LifeEvent>) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  addNote: (note: Omit<Note, "id" | "updatedAt">) => Promise<void>;
  updateNote: (id: number, patch: Partial<Note>) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  addResearch: (topic: Omit<ResearchTopic, "id" | "subtopics">) => void;
  updateResearch: (id: number, patch: Partial<ResearchTopic>) => void;
  deleteResearch: (id: number) => void;
  addSubtopic: (researchId: number, sub: Omit<Subtopic, "id">) => void;
  updateSubtopic: (researchId: number, subId: number, patch: Partial<Subtopic>) => void;
  deleteSubtopic: (researchId: number, subId: number) => void;
  resetData: () => void;
}

const initialCounters: Counters = {
  task: 1,
  project: 1,
  plan: 1,
  event: 1,
  note: 1,
  research: 1,
  routine: 1,
  transaction: 1,
};

function completionPercent(doneCount: number, totalCount: number) {
  return totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
}

function applyProjectProgress(projects: Project[], tasks: Task[]): Project[] {
  return projects.map((project) => {
    const stages = project.stages.map((stage) => {
      const stageTasks = tasks.filter(
        (task) => task.projectId === project.id && task.stageId === stage.id,
      );
      const doneTasks = stageTasks.filter((task) => task.status === "done").length;
      return { ...stage, progress: completionPercent(doneTasks, stageTasks.length) };
    });
    const doneStages = stages.filter((stage) => stage.status === "done").length;
    return { ...project, stages, progress: completionPercent(doneStages, stages.length) };
  });
}

function buildInitialState() {
  return {
    tasks: [] as Task[],
    projects: [] as Project[],
    plans: [] as Plan[],
    events: [] as LifeEvent[],
    notes: [] as Note[],
    research: [] as ResearchTopic[],
    routines: [] as Routine[],
    transactions: [] as Transaction[],
    counters: { ...initialCounters },
  };
}

function updateProjectsWithTasks(projects: Project[], tasks: Task[]) {
  return applyProjectProgress(projects, tasks);
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function nextCounters(state: {
  tasks: Task[];
  projects: Project[];
  plans: Plan[];
  events: LifeEvent[];
  notes: Note[];
  research: ResearchTopic[];
  routines: Routine[];
  transactions: Transaction[];
}): Counters {
  return {
    task: Math.max(0, ...state.tasks.map((item) => item.id)) + 1,
    project: Math.max(0, ...state.projects.map((item) => item.id)) + 1,
    plan: Math.max(0, ...state.plans.map((item) => item.id)) + 1,
    event: Math.max(0, ...state.events.map((item) => item.id)) + 1,
    note: Math.max(0, ...state.notes.map((item) => item.id)) + 1,
    research: Math.max(0, ...state.research.map((item) => item.id)) + 1,
    routine: Math.max(0, ...state.routines.map((item) => item.id)) + 1,
    transaction: Math.max(0, ...state.transactions.map((item) => item.id)) + 1,
  };
}

export const useStore = create<State>()((set, get) => ({
  ...buildInitialState(),
  isLoading: false,
  error: undefined,

  loadData: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const [projects, tasks, plans, events, notes, research, routines, transactions] =
        await Promise.all([
          fetchProjects(),
          fetchTasks(),
          fetchPlans(),
          fetchEvents(),
          fetchNotes(),
          fetchResearch(),
          fetchRoutines(),
          fetchTransactions(),
        ]);

      const nextState = {
        tasks,
        projects: updateProjectsWithTasks(projects, tasks),
        plans,
        events,
        notes: sortNotes(notes),
        research,
        routines,
        transactions,
      };

      set({
        ...nextState,
        counters: nextCounters(nextState),
        isLoading: false,
        error: undefined,
      });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? `Không tải được dữ liệu từ API. ${error.message}`
            : "Không tải được dữ liệu từ API.",
      });
    }
  },

  addTask: async (task) => {
    const createdTask = await createTaskApi(task);

    set((state) => {
      const tasks = [createdTask, ...state.tasks];
      return {
        tasks,
        projects: updateProjectsWithTasks(state.projects, tasks),
        counters: { ...state.counters, task: Math.max(state.counters.task, createdTask.id + 1) },
      };
    });

    return createdTask;
  },

  updateTask: async (id, patch) => {
    const updatedTask = await updateTaskApi(id, patch);
    set((state) => {
      const tasks = state.tasks.map((task) => (task.id === id ? updatedTask : task));

      return {
        tasks,
        projects: updateProjectsWithTasks(state.projects, tasks),
      };
    });
  },

  deleteTask: async (id) => {
    await deleteTaskApi(id);
    set((state) => {
      const tasks = state.tasks.filter((task) => task.id !== id);
      return {
        tasks,
        projects: updateProjectsWithTasks(state.projects, tasks),
      };
    });
  },

  toggleStep: async (taskId, stepId) => {
    const task = get().tasks.find((item) => item.id === taskId);
    if (!task) return;
    const updatedTask = await updateTaskApi(taskId, {
      steps: task.steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)),
    });
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
      projects: updateProjectsWithTasks(
        state.projects,
        state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
      ),
    }));
  },

  addProject: async (project) => {
    const createdProject = await createProjectApi(project);

    set((state) => ({
      projects: updateProjectsWithTasks([createdProject, ...state.projects], state.tasks),
      counters: {
        ...state.counters,
        project: Math.max(state.counters.project, createdProject.id + 1),
      },
    }));

    return createdProject;
  },

  updateProject: async (id, patch) => {
    const updatedProject = await updateProjectApi(id, patch);
    set((state) => ({
      projects: updateProjectsWithTasks(
        state.projects.map((project) => (project.id === id ? updatedProject : project)),
        state.tasks,
      ),
    }));
  },

  deleteProject: async (id) => {
    await deleteProjectApi(id);
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      tasks: state.tasks.map((task) =>
        task.projectId !== id ? task : { ...task, projectId: undefined, stageId: undefined },
      ),
    }));
    set((state) => ({
      projects: updateProjectsWithTasks(state.projects, state.tasks),
    }));
  },

  addStage: async (projectId, name) => {
    const createdStage = await createStageApi(projectId, name);
    set((state) => ({
      projects: updateProjectsWithTasks(
        state.projects.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            stages: [...project.stages, createdStage],
          };
        }),
        state.tasks,
      ),
    }));
  },

  updateStage: async (projectId, stageId, patch) => {
    const updatedStage = await updateStageApi(stageId, patch);
    set((state) => ({
      projects: updateProjectsWithTasks(
        state.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                stages: project.stages.map((stage) =>
                  stage.id !== stageId ? stage : updatedStage,
                ),
              },
        ),
        state.tasks,
      ),
    }));
  },

  deleteStage: async (projectId, stageId) => {
    await deleteStageApi(stageId);
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.projectId === projectId && task.stageId === stageId
          ? { ...task, stageId: undefined }
          : task,
      ),
      projects: state.projects.map((project) =>
        project.id !== projectId
          ? project
          : { ...project, stages: project.stages.filter((stage) => stage.id !== stageId) },
      ),
    }));
    set((state) => ({
      projects: updateProjectsWithTasks(state.projects, state.tasks),
    }));
  },

  toggleRoutine: async (id) => {
    const routine = get().routines.find((item) => item.id === id);
    if (!routine) return;
    const updatedRoutine = await toggleRoutineCheckin(routine);
    set((state) => ({
      routines: state.routines.map((item) => (item.id === id ? updatedRoutine : item)),
    }));
  },

  addRoutine: async (name) => {
    const createdRoutine = await createRoutineApi(name);
    set((state) => ({
      routines: [createdRoutine, ...state.routines],
      counters: {
        ...state.counters,
        routine: Math.max(state.counters.routine, createdRoutine.id + 1),
      },
    }));
  },

  deleteRoutine: async (id) => {
    await deleteRoutineApi(id);
    set((state) => ({
      routines: state.routines.filter((routine) => routine.id !== id),
    }));
  },

  addTransaction: async (tx) => {
    const createdTransaction = await createTransactionApi(tx);

    set((state) => ({
      transactions: [createdTransaction, ...state.transactions],
      counters: {
        ...state.counters,
        transaction: Math.max(state.counters.transaction, createdTransaction.id + 1),
      },
    }));

    return createdTransaction;
  },

  updateTransaction: async (id, patch, currentType) => {
    const updatedTransaction = await updateTransactionApi(id, patch, currentType);
    set((state) => ({
      transactions: state.transactions.map((transaction) =>
        transaction.id === id && (!currentType || transaction.type === currentType)
          ? updatedTransaction
          : transaction,
      ),
    }));
  },

  deleteTransaction: async (id, type) => {
    await deleteTransactionApi(id, type);
    set((state) => ({
      transactions: state.transactions.filter(
        (transaction) => !(transaction.id === id && (!type || transaction.type === type)),
      ),
    }));
  },

  addPlan: async (plan) => {
    const createdPlan = await createPlanApi(plan);
    set((state) => ({
      plans: [createdPlan, ...state.plans],
      counters: { ...state.counters, plan: Math.max(state.counters.plan, createdPlan.id + 1) },
    }));
  },

  updatePlan: async (id, patch) => {
    const updatedPlan = await updatePlanApi(id, patch);
    set((state) => ({
      plans: state.plans.map((plan) => (plan.id === id ? updatedPlan : plan)),
    }));
  },

  deletePlan: async (id) => {
    await deletePlanApi(id);
    set((state) => ({
      plans: state.plans.filter((plan) => plan.id !== id),
    }));
  },

  addEvent: async (event) => {
    const createdEvent = await createEventApi(event);
    set((state) => ({
      events: [...state.events, createdEvent].sort((a, b) =>
        a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
      ),
      counters: { ...state.counters, event: Math.max(state.counters.event, createdEvent.id + 1) },
    }));
  },

  updateEvent: async (id, patch) => {
    const updatedEvent = await updateEventApi(id, patch);
    set((state) => ({
      events: state.events
        .map((event) => (event.id === id ? updatedEvent : event))
        .sort((a, b) =>
          a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
        ),
    }));
  },

  deleteEvent: async (id) => {
    await deleteEventApi(id);
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    }));
  },

  addNote: async (note) => {
    const createdNote = await createNoteApi(note);
    set((state) => ({
      notes: sortNotes([createdNote, ...state.notes]),
      counters: { ...state.counters, note: Math.max(state.counters.note, createdNote.id + 1) },
    }));
  },

  updateNote: async (id, patch) => {
    const updatedNote = await updateNoteApi(id, patch);
    set((state) => ({
      notes: sortNotes(state.notes.map((note) => (note.id === id ? updatedNote : note))),
    }));
  },

  deleteNote: async (id) => {
    await deleteNoteApi(id);
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
    }));
  },

  addResearch: async (topic) => {
    const createdTopic = await createResearchApi(topic);
    set((state) => ({
      research: [createdTopic, ...state.research],
      counters: {
        ...state.counters,
        research: Math.max(state.counters.research, createdTopic.id + 1),
      },
    }));
  },

  updateResearch: async (id, patch) => {
    const updatedTopic = await updateResearchApi(id, patch);
    set((state) => ({
      research: state.research.map((topic) => (topic.id === id ? updatedTopic : topic)),
    }));
  },

  deleteResearch: async (id) => {
    await deleteResearchApi(id);
    set((state) => ({
      research: state.research.filter((topic) => topic.id !== id),
    }));
  },

  addSubtopic: async (researchId, sub) => {
    const createdSubtopic = await createSubtopicApi(researchId, sub);
    set((state) => ({
      research: state.research.map((topic) =>
        topic.id !== researchId
          ? topic
          : { ...topic, subtopics: [...topic.subtopics, createdSubtopic] },
      ),
    }));
  },

  updateSubtopic: async (researchId, subId, patch) => {
    const updatedSubtopic = await updateSubtopicApi(subId, patch);
    set((state) => ({
      research: state.research.map((topic) =>
        topic.id !== researchId
          ? topic
          : {
              ...topic,
              subtopics: topic.subtopics.map((subtopic) =>
                subtopic.id === subId ? updatedSubtopic : subtopic,
              ),
            },
      ),
    }));
  },

  deleteSubtopic: async (researchId, subId) => {
    await deleteSubtopicApi(subId);
    set((state) => ({
      research: state.research.map((topic) =>
        topic.id !== researchId
          ? topic
          : {
              ...topic,
              subtopics: topic.subtopics.filter((subtopic) => subtopic.id !== subId),
            },
      ),
    }));
  },

  resetData: () =>
    set({
      ...buildInitialState(),
      isLoading: false,
      error: undefined,
    }),
}));
