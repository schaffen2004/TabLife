import type {
  Plan,
  PlanRequirement,
  Project,
  ProjectStage,
  ResearchTopic,
  Routine,
  Subtopic,
  Task,
  TaskStep,
  Transaction,
} from "./mock-data";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://api.d4f.io.vn/api").replace(
  /\/+$/,
  "",
);

type WorkStatus = "new" | "in_progress" | "done" | "cancel";
type TaskPriority = "low" | "medium" | "high";

type BackendProject = {
  project_id: number;
  name: string;
  description: string;
  goal: string;
  status: WorkStatus;
  start_at: string;
  end_at: string;
  progress?: number;
};

type BackendStage = {
  stage_id: number;
  project_id: number;
  name: string;
  goal?: string;
  status: WorkStatus;
  progress?: number;
};

type BackendTask = {
  task_id: number;
  goal: string;
  expected_result: string;
  actual_result?: string | null;
  status: WorkStatus;
  start_at: string;
  deadline: string;
  project_id: number;
  project_stage_id?: number | null;
  priority: TaskPriority;
};

type BackendTaskStep = {
  step_id: number;
  task_id: number;
  step_name: string;
  position?: number;
  status: WorkStatus;
};

type BackendTaskLink = {
  link_id: number;
  task_id: number;
  url: string;
  title?: string | null;
};

type BackendResearch = {
  research_topic_id: number;
  name: string;
  description: string;
  status: WorkStatus;
  start_at: string;
  link?: string | null;
};

type BackendSubtopic = {
  subtopic_id: number;
  topic_id?: number;
  research_topic_id?: number;
  name: string;
  status: WorkStatus;
  start_at: string;
  description: string;
  note?: string | null;
};

type BackendSubtopicLink = {
  link_id: number;
  subtopic_id: number;
  url: string;
  title?: string | null;
};

type BackendPlan = {
  plan_id: number;
  name: string;
  goal: string;
  estimated_time: string;
  status: Plan["status"];
  requirements?: BackendRequirement[];
};

type BackendRequirement = {
  requirement_id: number;
  name: string;
  status: WorkStatus;
  position?: number;
};

type BackendRoutine = {
  routine_id: number;
  name: string;
  note?: string | null;
  streak: number;
};

type BackendRoutineCheckin = {
  checkin_id: number;
  routine_id: number;
  completed_on: string;
};

type BackendIncome = {
  income_id: number;
  amount: number;
  category: string;
  income_date: string;
  note?: string | null;
};

type BackendExpense = {
  expense_id: number;
  amount: number;
  category: string;
  expense_date: string;
  note?: string | null;
};

export type BackendSettings = {
  notification: boolean;
  today_task: boolean;
  daily_routine_report: boolean;
  finance_alert: boolean;
  schedule_for_tomorrow: boolean;
  today_task_time: string;
  daily_routine_report_time: string;
  finance_report_time: string;
  schedule_for_tomorrow_time: string;
  timezone: string;
  language: string;
  chat_id: number | string;
  token: string;
  current_time?: string;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Ignore invalid error bodies.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function toTaskStep(step: BackendTaskStep): TaskStep {
  return {
    id: step.step_id,
    text: step.step_name,
    done: step.status === "done",
  };
}

function toProjectStage(stage: BackendStage): ProjectStage {
  return {
    id: stage.stage_id,
    name: stage.name,
    progress: stage.progress ?? 0,
    status: stage.status,
  };
}

function toProject(project: BackendProject, stages: ProjectStage[]): Project {
  return {
    id: project.project_id,
    name: project.name,
    description: project.description || project.goal || "",
    status: project.status,
    startAt: project.start_at,
    deadline: project.end_at,
    progress: project.progress ?? 0,
    stages,
  };
}

function toTask(task: BackendTask, steps: TaskStep[], links: BackendTaskLink[]): Task {
  return {
    id: task.task_id,
    goal: task.goal,
    steps,
    expectedResult: task.expected_result || "",
    actualResult: task.actual_result || undefined,
    status: task.status,
    startAt: task.start_at,
    deadline: task.deadline,
    projectId: task.project_id,
    stageId: task.project_stage_id ?? undefined,
    priority: task.priority,
    link: links[0]?.url,
    links: links.length ? links.map((item) => item.url) : undefined,
  };
}

function toSubtopic(subtopic: BackendSubtopic, links: BackendSubtopicLink[]): Subtopic {
  return {
    id: subtopic.subtopic_id,
    name: subtopic.name,
    status: subtopic.status,
    startAt: subtopic.start_at,
    description: subtopic.description || "",
    note: subtopic.note || undefined,
    link: links[0]?.url,
  };
}

function toResearch(topic: BackendResearch, subtopics: Subtopic[]): ResearchTopic {
  return {
    id: topic.research_topic_id,
    name: topic.name,
    description: topic.description || "",
    status: topic.status,
    startAt: topic.start_at,
    link: topic.link || undefined,
    subtopics,
  };
}

function toPlanRequirement(requirement: BackendRequirement): PlanRequirement {
  return {
    id: requirement.requirement_id,
    name: requirement.name,
    status: requirement.status,
  };
}

function toPlan(plan: BackendPlan): Plan {
  return {
    id: plan.plan_id,
    name: plan.name,
    goal: plan.goal || "",
    estimatedTime: plan.estimated_time || "",
    status: plan.status,
    relatedProjectId: undefined,
    requirements: (plan.requirements ?? []).map(toPlanRequirement),
  };
}

function getWeekHistory(checkins: BackendRoutineCheckin[]): boolean[] {
  const today = new Date();
  const monday = new Date(today);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    const key = current.toISOString().slice(0, 10);
    return checkins.some((checkin) => checkin.completed_on === key);
  });
}

function toRoutine(routine: BackendRoutine, checkins: BackendRoutineCheckin[]): Routine {
  const todayKey = new Date().toISOString().slice(0, 10);
  return {
    id: routine.routine_id,
    name: routine.name,
    note: routine.note || undefined,
    streak: routine.streak,
    doneToday: checkins.some((checkin) => checkin.completed_on === todayKey),
    weekHistory: getWeekHistory(checkins),
  };
}

function toIncomeTransaction(income: BackendIncome): Transaction {
  return {
    id: income.income_id,
    type: "income",
    amount: income.amount,
    category: income.category,
    date: income.income_date,
    note: income.note || undefined,
  };
}

function toExpenseTransaction(expense: BackendExpense): Transaction {
  return {
    id: expense.expense_id,
    type: "expense",
    amount: expense.amount,
    category: expense.category,
    date: expense.expense_date,
    note: expense.note || undefined,
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const [projects, stages] = await Promise.all([
    apiRequest<BackendProject[]>("/projects"),
    apiRequest<BackendProject[]>("/projects").then(async (items) =>
      Promise.all(
        items.map(async (project) => ({
          projectId: project.project_id,
          stages: await apiRequest<BackendStage[]>(`/projects/${project.project_id}/stages`),
        })),
      ),
    ),
  ]);

  const stageMap = new Map<number, ProjectStage[]>(
    stages.map((item) => [item.projectId, item.stages.map(toProjectStage)]),
  );

  return projects.map((project) => toProject(project, stageMap.get(project.project_id) ?? []));
}

export async function fetchTasks(): Promise<Task[]> {
  const tasks = await apiRequest<BackendTask[]>("/tasks");
  const taskDetails = await Promise.all(
    tasks.map(async (task) => {
      const [steps, links] = await Promise.all([
        apiRequest<BackendTaskStep[]>(`/tasks/${task.task_id}/steps`),
        apiRequest<BackendTaskLink[]>(`/tasks/${task.task_id}/links`),
      ]);
      return toTask(task, steps.map(toTaskStep), links);
    }),
  );
  return taskDetails;
}

export async function fetchResearch(): Promise<ResearchTopic[]> {
  const topics = await apiRequest<BackendResearch[]>("/research");
  return Promise.all(
    topics.map(async (topic) => {
      const subtopics = await apiRequest<BackendSubtopic[]>(
        `/research/${topic.research_topic_id}/subtopics`,
      );
      const withLinks = await Promise.all(
        subtopics.map(async (subtopic) => {
          const links = await apiRequest<BackendSubtopicLink[]>(
            `/research/subtopics/${subtopic.subtopic_id}/links`,
          );
          return toSubtopic(subtopic, links);
        }),
      );
      return toResearch(topic, withLinks);
    }),
  );
}

export async function fetchPlans(): Promise<Plan[]> {
  const plans = await apiRequest<BackendPlan[]>("/plans?include_requirements=true");
  return plans.map(toPlan);
}

export async function fetchRoutines(): Promise<Routine[]> {
  const routines = await apiRequest<BackendRoutine[]>("/routines");
  return Promise.all(
    routines.map(async (routine) => {
      const checkins = await apiRequest<BackendRoutineCheckin[]>(
        `/routines/${routine.routine_id}/checkins?limit=30`,
      );
      return toRoutine(routine, checkins);
    }),
  );
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const [income, expense] = await Promise.all([
    apiRequest<BackendIncome[]>("/finance/income"),
    apiRequest<BackendExpense[]>("/finance/expense"),
  ]);
  return [...income.map(toIncomeTransaction), ...expense.map(toExpenseTransaction)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export async function createProject(payload: {
  name: string;
  description: string;
  startAt: string;
  deadline: string;
  status: Project["status"];
}): Promise<Project> {
  const project = await apiRequest<BackendProject>("/projects", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      goal: payload.description,
      start_at: payload.startAt,
      end_at: payload.deadline,
      status: payload.status,
    }),
  });
  return toProject(project, []);
}

export async function updateProject(projectId: number, patch: Partial<Project>): Promise<Project> {
  const project = await apiRequest<BackendProject>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: patch.name,
      description: patch.description,
      goal: patch.description,
      status: patch.status,
      start_at: patch.startAt,
      end_at: patch.deadline,
    }),
  });
  const stages = await apiRequest<BackendStage[]>(`/projects/${projectId}/stages`);
  return toProject(project, stages.map(toProjectStage));
}

export async function deleteProject(projectId: number): Promise<void> {
  await apiRequest(`/projects/${projectId}`, { method: "DELETE" });
}

export async function createStage(projectId: number, name: string): Promise<ProjectStage> {
  const stage = await apiRequest<BackendStage>(`/projects/${projectId}/stages`, {
    method: "POST",
    body: JSON.stringify({ name, status: "new" }),
  });
  return toProjectStage(stage);
}

export async function updateStage(
  stageId: number,
  patch: Partial<ProjectStage>,
): Promise<ProjectStage> {
  const stage = await apiRequest<BackendStage>(`/stages/${stageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: patch.name,
      status: patch.status,
    }),
  });
  return toProjectStage(stage);
}

export async function deleteStage(stageId: number): Promise<void> {
  await apiRequest(`/stages/${stageId}`, { method: "DELETE" });
}

export async function createTask(payload: Omit<Task, "id">): Promise<Task> {
  const created = await apiRequest<BackendTask>("/tasks", {
    method: "POST",
    body: JSON.stringify({
      goal: payload.goal,
      project_id: payload.projectId,
      start_at: payload.startAt,
      deadline: payload.deadline,
      expected_result: payload.expectedResult,
      status: payload.status,
      priority: payload.priority,
      project_stage_id: payload.stageId,
    }),
  });

  const steps = payload.steps
    ? await Promise.all(
        payload.steps.map((step, index) =>
          apiRequest<BackendTaskStep>(`/tasks/${created.task_id}/steps`, {
            method: "POST",
            body: JSON.stringify({
              step_name: step.text,
              position: index + 1,
              status: step.done ? "done" : "new",
            }),
          }),
        ),
      )
    : [];

  const links = payload.links ?? (payload.link ? [payload.link] : []);
  const createdLinks = await Promise.all(
    links.map((link) =>
      apiRequest<BackendTaskLink>(`/tasks/${created.task_id}/links`, {
        method: "POST",
        body: JSON.stringify({ url: link }),
      }),
    ),
  );

  return toTask(created, steps.map(toTaskStep), createdLinks);
}

export async function updateTask(taskId: number, patch: Partial<Task>): Promise<Task> {
  const updated = await apiRequest<BackendTask>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({
      goal: patch.goal,
      expected_result: patch.expectedResult,
      actual_result: patch.actualResult,
      status: patch.status,
      priority: patch.priority,
      start_at: patch.startAt,
      deadline: patch.deadline,
      project_stage_id: patch.stageId,
    }),
  });

  const currentSteps = await apiRequest<BackendTaskStep[]>(`/tasks/${taskId}/steps`);
  const currentLinks = await apiRequest<BackendTaskLink[]>(`/tasks/${taskId}/links`);

  if (patch.steps) {
    await apiRequest(`/tasks/${taskId}/steps`, { method: "DELETE" });
    for (const [index, step] of patch.steps.entries()) {
      await apiRequest<BackendTaskStep>(`/tasks/${taskId}/steps`, {
        method: "POST",
        body: JSON.stringify({
          step_name: step.text,
          position: index + 1,
          status: step.done ? "done" : "new",
        }),
      });
    }
  }

  if (patch.links || patch.link !== undefined) {
    for (const link of currentLinks) {
      await apiRequest(`/tasks/links/${link.link_id}`, { method: "DELETE" });
    }
    const nextLinks = patch.links ?? (patch.link ? [patch.link] : []);
    for (const link of nextLinks) {
      await apiRequest(`/tasks/${taskId}/links`, {
        method: "POST",
        body: JSON.stringify({ url: link }),
      });
    }
  }

  const [steps, links] = await Promise.all([
    apiRequest<BackendTaskStep[]>(`/tasks/${taskId}/steps`),
    apiRequest<BackendTaskLink[]>(`/tasks/${taskId}/links`),
  ]);

  return toTask(updated, steps.map(toTaskStep), links);
}

export async function deleteTask(taskId: number): Promise<void> {
  await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
}

export async function createResearch(payload: {
  name: string;
  description: string;
  status: ResearchTopic["status"];
  startAt: string;
}): Promise<ResearchTopic> {
  const topic = await apiRequest<BackendResearch>("/research", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      status: payload.status,
      start_at: payload.startAt,
    }),
  });
  return toResearch(topic, []);
}

export async function updateResearch(
  topicId: number,
  patch: Partial<ResearchTopic>,
): Promise<ResearchTopic> {
  const topic = await apiRequest<BackendResearch>(`/research/${topicId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: patch.name,
      description: patch.description,
      status: patch.status,
      start_at: patch.startAt,
      link: patch.link,
    }),
  });
  const subtopics = await apiRequest<BackendSubtopic[]>(`/research/${topicId}/subtopics`);
  return toResearch(
    topic,
    subtopics.map((subtopic) => ({
      id: subtopic.subtopic_id,
      name: subtopic.name,
      status: subtopic.status,
      startAt: subtopic.start_at,
      description: subtopic.description,
      note: subtopic.note || undefined,
    })),
  );
}

export async function deleteResearch(topicId: number): Promise<void> {
  await apiRequest(`/research/${topicId}`, { method: "DELETE" });
}

export async function createSubtopic(
  researchId: number,
  payload: Omit<Subtopic, "id">,
): Promise<Subtopic> {
  const subtopic = await apiRequest<BackendSubtopic>(`/research/${researchId}/subtopics`, {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      start_at: payload.startAt,
      description: payload.description,
      note: payload.note,
      status: payload.status,
    }),
  });
  const links = payload.link
    ? [
        await apiRequest<BackendSubtopicLink>(`/research/subtopics/${subtopic.subtopic_id}/links`, {
          method: "POST",
          body: JSON.stringify({ url: payload.link }),
        }),
      ]
    : [];
  return toSubtopic(subtopic, links);
}

export async function updateSubtopic(
  subtopicId: number,
  patch: Partial<Subtopic>,
): Promise<Subtopic> {
  const subtopic = await apiRequest<BackendSubtopic>(`/research/subtopics/${subtopicId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: patch.name,
      description: patch.description,
      note: patch.note,
      status: patch.status,
      start_at: patch.startAt,
    }),
  });
  const links = await apiRequest<BackendSubtopicLink[]>(`/research/subtopics/${subtopicId}/links`);
  if (patch.link !== undefined) {
    for (const link of links) {
      await apiRequest(`/research/links/${link.link_id}`, { method: "DELETE" });
    }
    if (patch.link) {
      await apiRequest(`/research/subtopics/${subtopicId}/links`, {
        method: "POST",
        body: JSON.stringify({ url: patch.link }),
      });
    }
  }
  const nextLinks = await apiRequest<BackendSubtopicLink[]>(
    `/research/subtopics/${subtopicId}/links`,
  );
  return toSubtopic(subtopic, nextLinks);
}

export async function deleteSubtopic(subtopicId: number): Promise<void> {
  await apiRequest(`/research/subtopics/${subtopicId}`, { method: "DELETE" });
}

export async function createPlan(payload: Omit<Plan, "id">): Promise<Plan> {
  const plan = await apiRequest<BackendPlan>("/plans", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      goal: payload.goal,
      estimated_time: payload.estimatedTime,
      status: payload.status,
    }),
  });

  const requirements = await Promise.all(
    payload.requirements.map((requirement) =>
      apiRequest<BackendRequirement>(`/plans/${plan.plan_id}/requirements`, {
        method: "POST",
        body: JSON.stringify({
          name: requirement.name,
          status: requirement.status,
        }),
      }),
    ),
  );

  return toPlan({ ...plan, requirements });
}

export async function updatePlan(planId: number, patch: Partial<Plan>): Promise<Plan> {
  const plan = await apiRequest<BackendPlan>(`/plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: patch.name,
      goal: patch.goal,
      estimated_time: patch.estimatedTime,
      status: patch.status,
    }),
  });

  if (patch.requirements) {
    const existing = await apiRequest<BackendRequirement[]>(`/plans/${planId}/requirements`);
    for (const requirement of existing) {
      await apiRequest(`/plans/requirements/${requirement.requirement_id}`, { method: "DELETE" });
    }
    for (const requirement of patch.requirements) {
      await apiRequest(`/plans/${planId}/requirements`, {
        method: "POST",
        body: JSON.stringify({
          name: requirement.name,
          status: requirement.status,
        }),
      });
    }
  }

  const requirements = await apiRequest<BackendRequirement[]>(`/plans/${planId}/requirements`);
  return toPlan({ ...plan, requirements });
}

export async function deletePlan(planId: number): Promise<void> {
  await apiRequest(`/plans/${planId}`, { method: "DELETE" });
}

export async function createRoutine(name: string): Promise<Routine> {
  const routine = await apiRequest<BackendRoutine>("/routines", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return toRoutine(routine, []);
}

export async function toggleRoutineCheckin(routine: Routine): Promise<Routine> {
  if (routine.doneToday) {
    await apiRequest(`/routines/${routine.id}/checkins`, { method: "DELETE" });
  } else {
    await apiRequest(`/routines/${routine.id}/checkins`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  const [item, checkins] = await Promise.all([
    apiRequest<BackendRoutine>(`/routines/${routine.id}`),
    apiRequest<BackendRoutineCheckin[]>(`/routines/${routine.id}/checkins?limit=30`),
  ]);
  return toRoutine(item, checkins);
}

export async function deleteRoutine(routineId: number): Promise<void> {
  await apiRequest(`/routines/${routineId}`, { method: "DELETE" });
}

export async function createTransaction(payload: Omit<Transaction, "id">): Promise<Transaction> {
  if (payload.type === "income") {
    const income = await apiRequest<BackendIncome>("/finance/income", {
      method: "POST",
      body: JSON.stringify({
        amount: payload.amount,
        category: payload.category,
        income_date: payload.date,
        note: payload.note,
      }),
    });
    return toIncomeTransaction(income);
  }

  const expense = await apiRequest<BackendExpense>("/finance/expense", {
    method: "POST",
    body: JSON.stringify({
      amount: payload.amount,
      category: payload.category,
      expense_date: payload.date,
      note: payload.note,
    }),
  });
  return toExpenseTransaction(expense);
}

export async function updateTransaction(
  id: number,
  patch: Partial<Transaction>,
  currentType?: Transaction["type"],
): Promise<Transaction> {
  const type = patch.type ?? currentType;
  if (!type) {
    throw new Error("Thiếu loại giao dịch");
  }

  if (type === "income") {
    const income = await apiRequest<BackendIncome>(`/finance/income/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        amount: patch.amount,
        category: patch.category,
        income_date: patch.date,
        note: patch.note,
      }),
    });
    return toIncomeTransaction(income);
  }

  const expense = await apiRequest<BackendExpense>(`/finance/expense/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      amount: patch.amount,
      category: patch.category,
      expense_date: patch.date,
      note: patch.note,
    }),
  });
  return toExpenseTransaction(expense);
}

export async function deleteTransaction(id: number, type?: Transaction["type"]): Promise<void> {
  if (!type) {
    throw new Error("Thiếu loại giao dịch");
  }
  await apiRequest(`/finance/${type}/${id}`, { method: "DELETE" });
}

export async function fetchSettings(): Promise<BackendSettings> {
  return apiRequest<BackendSettings>("/settings");
}

export async function updateSettings(patch: Partial<BackendSettings>): Promise<BackendSettings> {
  return apiRequest<BackendSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
