// Types & seed data. All IDs are numeric.

export type TaskStatus = "new" | "in_progress" | "done" | "cancel";
export type WorkStatus = "new" | "in_progress" | "done" | "cancel";
export type ProjectStatus = WorkStatus;
export type PlanStatus = "draft" | "active" | "done" | "cancel";
export type Priority = "low" | "medium" | "high";

export interface TaskStep {
  id: number;
  text: string;
  done: boolean;
}

export interface Task {
  id: number;
  goal: string;
  steps: TaskStep[];
  expectedResult: string;
  actualResult?: string;
  status: TaskStatus;
  startAt: string;
  deadline: string;
  link?: string;
  links?: string[];
  projectId?: number;
  stageId?: number;
  researchId?: number;
  priority: Priority;
}

export interface ProjectStage {
  id: number;
  name: string;
  progress: number;
  status: WorkStatus;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  startAt: string;
  deadline: string;
  progress: number;
  stages: ProjectStage[];
}

export interface Plan {
  id: number;
  name: string;
  goal: string;
  requirements: PlanRequirement[];
  estimatedTime: string;
  status: PlanStatus;
  relatedProjectId?: number;
}

export interface PlanRequirement {
  id: number;
  name: string;
  status: WorkStatus;
}

export interface Subtopic {
  id: number;
  name: string;
  status: WorkStatus;
  startAt: string;
  link?: string;
  description: string;
  note?: string;
}

export interface ResearchTopic {
  id: number;
  name: string;
  description: string;
  status: WorkStatus;
  startAt: string;
  link?: string;
  subtopics: Subtopic[];
}

export interface Routine {
  id: number;
  name: string;
  doneToday: boolean;
  streak: number;
  note?: string;
  weekHistory: boolean[];
}

export interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export const seedProjects: Project[] = [
  {
    id: 1,
    name: "TabLife MVP",
    description: "Phát triển nền tảng quản lý cuộc sống cá nhân",
    status: "in_progress",
    startAt: "2026-05-01",
    deadline: "2026-08-30",
    progress: 62,
    stages: [
      { id: 1, name: "Research & Design", progress: 100, status: "done" },
      { id: 2, name: "Core Backend", progress: 80, status: "in_progress" },
      { id: 3, name: "Frontend Build", progress: 55, status: "in_progress" },
      { id: 4, name: "Testing & Launch", progress: 10, status: "new" },
    ],
  },
  {
    id: 2,
    name: "Personal Brand 2026",
    description: "Xây dựng kênh nội dung và portfolio cá nhân",
    status: "in_progress",
    startAt: "2026-03-15",
    deadline: "2026-12-31",
    progress: 35,
    stages: [
      { id: 1, name: "Định vị thương hiệu", progress: 100, status: "done" },
      { id: 2, name: "Sản xuất nội dung", progress: 40, status: "in_progress" },
      { id: 3, name: "Phân phối & Tăng trưởng", progress: 5, status: "new" },
    ],
  },
  {
    id: 3,
    name: "Sức khỏe Q3",
    description: "Cải thiện thể lực và thói quen tập luyện",
    status: "in_progress",
    startAt: "2026-06-01",
    deadline: "2026-09-30",
    progress: 48,
    stages: [
      { id: 1, name: "Kế hoạch dinh dưỡng", progress: 70, status: "in_progress" },
      { id: 2, name: "Lịch tập gym", progress: 50, status: "in_progress" },
    ],
  },
  {
    id: 4,
    name: "Khoá học AI Engineering",
    description: "Hoàn thành chứng chỉ AI Engineer 2026",
    status: "cancel",
    startAt: "2026-04-01",
    deadline: "2026-10-15",
    progress: 22,
    stages: [
      { id: 1, name: "Foundation", progress: 80, status: "in_progress" },
      { id: 2, name: "Specialization", progress: 0, status: "new" },
    ],
  },
];

export const seedResearchTopics: ResearchTopic[] = [
  {
    id: 1,
    name: "Agentic AI Patterns",
    description: "Nghiên cứu kiến trúc và pattern cho AI agents",
    status: "in_progress",
    startAt: "2026-05-10",
    link: "https://example.com/agentic",
    subtopics: [
      {
        id: 1,
        name: "ReAct Pattern",
        status: "done",
        startAt: "2026-05-10",
        description: "Reasoning + Acting",
      },
      {
        id: 2,
        name: "Multi-agent orchestration",
        status: "in_progress",
        startAt: "2026-05-20",
        description: "Patterns điều phối nhiều agent",
      },
      {
        id: 3,
        name: "Memory systems",
        status: "new",
        startAt: "2026-06-01",
        description: "Long-term vs short-term memory",
      },
    ],
  },
  {
    id: 2,
    name: "Productivity Systems",
    description: "So sánh GTD, PARA, Building a Second Brain",
    status: "in_progress",
    startAt: "2026-04-01",
    subtopics: [
      {
        id: 1,
        name: "GTD Deep Dive",
        status: "done",
        startAt: "2026-04-01",
        description: "Getting Things Done",
      },
      {
        id: 2,
        name: "PARA Method",
        status: "in_progress",
        startAt: "2026-04-15",
        description: "Projects Areas Resources Archives",
      },
    ],
  },
  {
    id: 3,
    name: "Design Systems 2026",
    description: "Xu hướng design system hiện đại",
    status: "new",
    startAt: "2026-06-15",
    subtopics: [],
  },
];

const mkSteps = (arr: string[]): TaskStep[] =>
  arr.map((text, i) => ({ id: i + 1, text, done: false }));

export const seedTasks: Task[] = [
  {
    id: 1,
    goal: "Thiết kế landing page TabLife",
    steps: mkSteps(["Wireframe", "Mockup", "Review"]),
    expectedResult: "Landing v1",
    status: "in_progress",
    startAt: "2026-06-15",
    deadline: "2026-06-22",
    projectId: 1,
    stageId: 3,
    priority: "high",
  },
  {
    id: 2,
    goal: "Viết bài blog Agentic AI",
    steps: mkSteps(["Outline", "Draft", "Edit"]),
    expectedResult: "Bài 1500 từ",
    status: "new",
    startAt: "2026-06-18",
    deadline: "2026-06-25",
    researchId: 1,
    priority: "medium",
  },
  {
    id: 3,
    goal: "Setup CI/CD cho TabLife",
    steps: mkSteps(["Cấu hình GitHub Actions", "Test deploy"]),
    expectedResult: "Pipeline xanh",
    status: "done",
    actualResult: "Hoàn thành",
    startAt: "2026-06-10",
    deadline: "2026-06-14",
    projectId: 1,
    stageId: 2,
    priority: "high",
  },
  {
    id: 4,
    goal: "Gym - chân",
    steps: mkSteps(["Squat", "Lunges", "Calf raise"]),
    expectedResult: "60 phút",
    status: "done",
    startAt: "2026-06-17",
    deadline: "2026-06-17",
    projectId: 3,
    priority: "low",
  },
  {
    id: 5,
    goal: "Tổng kết tài chính tháng 5",
    steps: mkSteps(["Export giao dịch", "Phân tích"]),
    expectedResult: "Báo cáo tháng",
    status: "in_progress",
    startAt: "2026-06-12",
    deadline: "2026-06-20",
    priority: "medium",
  },
  {
    id: 6,
    goal: "Học module Memory systems",
    steps: mkSteps(["Đọc paper", "Tóm tắt"]),
    expectedResult: "Note + sơ đồ",
    status: "new",
    startAt: "2026-06-18",
    deadline: "2026-06-28",
    researchId: 1,
    priority: "medium",
  },
  {
    id: 7,
    goal: "Quay video portfolio",
    steps: mkSteps(["Script", "Quay", "Edit"]),
    expectedResult: "Video 3 phút",
    status: "cancel",
    startAt: "2026-06-05",
    deadline: "2026-06-15",
    projectId: 2,
    priority: "low",
  },
  {
    id: 8,
    goal: "Tích hợp Telegram bot",
    steps: mkSteps(["Setup bot", "Webhook"]),
    expectedResult: "Thông báo hoạt động",
    status: "in_progress",
    startAt: "2026-06-16",
    deadline: "2026-06-24",
    projectId: 1,
    stageId: 2,
    priority: "high",
  },
  {
    id: 9,
    goal: "Review khoá AI tuần này",
    steps: mkSteps(["Xem video", "Làm bài tập"]),
    expectedResult: "Hoàn thành tuần 4",
    status: "new",
    startAt: "2026-06-18",
    deadline: "2026-06-22",
    projectId: 4,
    priority: "medium",
  },
  {
    id: 10,
    goal: "Lên menu ăn uống tuần",
    steps: mkSteps(["Lập danh sách", "Đi chợ"]),
    expectedResult: "Menu 7 ngày",
    status: "done",
    startAt: "2026-06-15",
    deadline: "2026-06-16",
    projectId: 3,
    priority: "low",
  },
];

export const seedPlans: Plan[] = [
  {
    id: 1,
    name: "Ra mắt TabLife Beta",
    goal: "Có 100 user beta",
    requirements: [
      { id: 1, name: "Hoàn thành MVP", status: "done" },
      { id: 2, name: "Landing page", status: "in_progress" },
      { id: 3, name: "Onboarding flow", status: "new" },
    ],
    estimatedTime: "8 tuần",
    status: "active",
    relatedProjectId: 1,
  },
  {
    id: 2,
    name: "Viết sách Productivity",
    goal: "Bản thảo 50.000 từ",
    requirements: [
      { id: 1, name: "Outline 10 chương", status: "new" },
      { id: 2, name: "Viết 1 chương/tuần", status: "new" },
    ],
    estimatedTime: "12 tuần",
    status: "draft",
  },
  {
    id: 3,
    name: "Du lịch Nhật mùa thu",
    goal: "Chuyến đi 10 ngày",
    requirements: [
      { id: 1, name: "Visa", status: "in_progress" },
      { id: 2, name: "Vé máy bay", status: "new" },
      { id: 3, name: "Khách sạn", status: "new" },
    ],
    estimatedTime: "3 tháng chuẩn bị",
    status: "active",
  },
  {
    id: 4,
    name: "Học thêm Rust",
    goal: "Build 1 CLI tool",
    requirements: [
      { id: 1, name: "Đọc Rust Book", status: "in_progress" },
      { id: 2, name: "Làm 3 project nhỏ", status: "new" },
    ],
    estimatedTime: "10 tuần",
    status: "draft",
  },
];

export const seedRoutines: Routine[] = [
  {
    id: 1,
    name: "Thiền 10 phút",
    doneToday: true,
    streak: 14,
    weekHistory: [true, true, true, false, true, true, true],
  },
  {
    id: 2,
    name: "Đọc sách 30 phút",
    doneToday: true,
    streak: 8,
    weekHistory: [true, true, true, true, false, true, true],
  },
  {
    id: 3,
    name: "Tập thể dục",
    doneToday: false,
    streak: 3,
    weekHistory: [true, false, true, true, true, false, false],
  },
  {
    id: 4,
    name: "Uống 2L nước",
    doneToday: true,
    streak: 21,
    weekHistory: [true, true, true, true, true, true, true],
  },
  {
    id: 5,
    name: "Viết nhật ký",
    doneToday: false,
    streak: 0,
    weekHistory: [false, true, false, true, false, false, false],
  },
  {
    id: 6,
    name: "Học tiếng Anh 20 phút",
    doneToday: true,
    streak: 5,
    weekHistory: [true, true, false, true, true, true, true],
  },
];

export const seedTransactions: Transaction[] = [
  {
    id: 1,
    type: "income",
    amount: 25000000,
    category: "Lương",
    date: "2026-06-01",
    note: "Lương tháng 6",
  },
  {
    id: 2,
    type: "income",
    amount: 5000000,
    category: "Freelance",
    date: "2026-06-10",
    note: "Dự án thiết kế",
  },
  { id: 3, type: "expense", amount: 4500000, category: "Ăn uống", date: "2026-06-05" },
  { id: 4, type: "expense", amount: 2000000, category: "Di chuyển", date: "2026-06-08" },
  {
    id: 5,
    type: "expense",
    amount: 1500000,
    category: "Giải trí",
    date: "2026-06-12",
    note: "Xem phim, cafe",
  },
  {
    id: 6,
    type: "expense",
    amount: 3000000,
    category: "Học tập",
    date: "2026-06-03",
    note: "Khoá học online",
  },
  {
    id: 7,
    type: "expense",
    amount: 800000,
    category: "Công cụ / phần mềm",
    date: "2026-06-15",
    note: "Subscription",
  },
  { id: 8, type: "expense", amount: 1200000, category: "Công việc", date: "2026-06-14" },
  { id: 9, type: "income", amount: 2000000, category: "Khác", date: "2026-06-16", note: "Thưởng" },
  { id: 10, type: "expense", amount: 600000, category: "Khác", date: "2026-06-17" },
];

export const expenseCategories = [
  "Ăn uống",
  "Di chuyển",
  "Học tập",
  "Công việc",
  "Giải trí",
  "Công cụ / phần mềm",
  "Lương",
  "Freelance",
  "Khác",
];

export const statusLabel: Record<string, string> = {
  new: "Mới",
  in_progress: "Đang làm",
  done: "Hoàn thành",
  cancel: "Đã huỷ",
  active: "Đang hoạt động",
  draft: "Nháp",
};

export const weeklyTaskProgress = [
  { day: "T2", done: 4, cancelled: 1, inProgress: 3 },
  { day: "T3", done: 6, cancelled: 0, inProgress: 4 },
  { day: "T4", done: 3, cancelled: 2, inProgress: 5 },
  { day: "T5", done: 7, cancelled: 1, inProgress: 3 },
  { day: "T6", done: 5, cancelled: 0, inProgress: 4 },
  { day: "T7", done: 2, cancelled: 1, inProgress: 2 },
  { day: "CN", done: 3, cancelled: 0, inProgress: 1 },
];

export const monthlyFinance = [
  { month: "T1", income: 28, expense: 18 },
  { month: "T2", income: 30, expense: 20 },
  { month: "T3", income: 32, expense: 22 },
  { month: "T4", income: 29, expense: 19 },
  { month: "T5", income: 31, expense: 24 },
  { month: "T6", income: 32, expense: 14 },
];

export function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export function formatId(n: number): string {
  return "#" + String(n).padStart(3, "0");
}
