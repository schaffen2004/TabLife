import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar,
  LayoutGrid,
  List,
  BarChart3,
  Search,
  Filter,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { ColoredStatusSelect, workStatusOptions } from "@/components/ColoredStatusSelect";
import { TaskDialog } from "@/components/TaskDialog";
import { useStore } from "@/lib/store";
import { formatId, weeklyTaskProgress, type Task, type TaskStatus } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Quản lý Task — TabLife" },
      { name: "description", content: "Kanban, Calendar, List và thống kê task." },
    ],
  }),
  component: TasksPage,
});

const columns: { status: TaskStatus; title: string }[] = [
  { status: "new", title: "Mới" },
  { status: "in_progress", title: "Đang làm" },
  { status: "done", title: "Hoàn thành" },
  { status: "cancel", title: "Đã huỷ" },
];

const taskStatusFilterOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  ...workStatusOptions,
] as const;

const statusTint: Record<TaskStatus, string> = {
  new: "border-warning/30 bg-warning/5 hover:border-warning/60",
  in_progress: "border-info/30 bg-info/5 hover:border-info/60",
  done: "border-success/30 bg-success/10 hover:border-success/60",
  cancel: "border-border bg-muted/50 opacity-70 hover:border-muted-foreground/40",
};

function TaskCard({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const projects = useStore((s) => s.projects);
  const project = projects.find((p) => p.id === task.projectId);
  const doneSteps = task.steps.filter((s) => s.done).length;
  const progress = task.steps.length ? (doneSteps / task.steps.length) * 100 : 0;
  return (
    <button
      onClick={() => onOpen(task)}
      className={`w-full cursor-pointer rounded-xl border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusTint[task.status]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{formatId(task.id)}</span>
        <StatusBadge status={task.priority} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{task.goal}</p>
      {project && <p className="mt-1 truncate text-xs text-primary">{project.name}</p>}
      <div className="mt-2.5 flex items-center gap-2">
        <Progress value={progress} className="h-1 flex-1" />
        <span className="text-[10px] text-muted-foreground">
          {doneSteps}/{task.steps.length}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>📅 {task.deadline.slice(5)}</span>
        {(task.link || task.links?.length) && <ExternalLink className="h-3 w-3" />}
      </div>
    </button>
  );
}

function KanbanView({
  onOpen,
  onCreate,
}: {
  onOpen: (t: Task) => void;
  onCreate: (status?: TaskStatus) => void;
}) {
  const tasks = useStore((s) => s.tasks);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const items = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={col.status} />
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCreate(col.status)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((t) => (
                <TaskCard key={t.id} task={t} onOpen={onOpen} />
              ))}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
                  Chưa có task
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ onOpen }: { onOpen: (t: Task) => void }) {
  const { tasks, projects } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [proj, setProj] = useState("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (proj !== "all" && String(t.projectId) !== proj) return false;
      if (q && !t.goal.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [tasks, q, status, proj]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm task..."
              className="h-9 pl-9"
            />
          </div>
          <ColoredStatusSelect
            value={status}
            onValueChange={setStatus}
            options={taskStatusFilterOptions}
            className="h-9 w-[150px]"
          />
          <Select value={proj} onValueChange={setProj}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-3.5 w-3.5" />
            Lọc
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Mục tiêu</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Ưu tiên</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => onOpen(t)}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatId(t.id)}
                </TableCell>
                <TableCell className="font-medium">{t.goal}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {projects.find((p) => p.id === t.projectId)?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-sm">{t.deadline}</TableCell>
                <TableCell>
                  <StatusBadge status={t.priority} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Không có task phù hợp
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CalendarView({ onOpen }: { onOpen: (t: Task) => void }) {
  const tasks = useStore((s) => s.tasks);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Tháng {month + 1} / {year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const dayTasks = d ? tasks.filter((t) => parseInt(t.deadline.slice(8, 10)) === d) : [];
            const isToday = d === today.getDate();
            return (
              <div
                key={i}
                className={`min-h-[88px] rounded-lg border p-1.5 text-xs ${d ? "bg-card" : "bg-transparent border-transparent"} ${isToday ? "border-primary ring-1 ring-primary/40" : ""}`}
              >
                {d && (
                  <>
                    <div className={`mb-1 text-right font-medium ${isToday ? "text-primary" : ""}`}>
                      {d}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => onOpen(t)}
                          className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] ${
                            t.status === "done"
                              ? "bg-success/15 text-success"
                              : t.status === "in_progress"
                                ? "bg-info/15 text-info"
                                : t.status === "cancel"
                                  ? "bg-muted text-muted-foreground line-through"
                                  : "bg-warning/15 text-warning"
                          }`}
                        >
                          {t.goal}
                        </button>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{dayTasks.length - 2}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsView() {
  const tasks = useStore((s) => s.tasks);
  const [range, setRange] = useState<"week" | "month" | "all">("week");

  const byStatus = columns.map((c) => ({
    name: c.title,
    value: tasks.filter((t) => t.status === c.status).length,
  }));
  const colors = ["var(--info)", "var(--primary)", "var(--success)", "var(--muted-foreground)"];
  const completion = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100)
    : 0;

  const weekData = weeklyTaskProgress;
  const monthData = [
    { day: "Tuần 1", done: 18, cancelled: 3, inProgress: 12 },
    { day: "Tuần 2", done: 22, cancelled: 2, inProgress: 14 },
    { day: "Tuần 3", done: 19, cancelled: 4, inProgress: 11 },
    { day: "Tuần 4", done: 25, cancelled: 1, inProgress: 9 },
  ];
  const allData = [
    { day: "T1", done: 70, cancelled: 12, inProgress: 28 },
    { day: "T2", done: 82, cancelled: 8, inProgress: 30 },
    { day: "T3", done: 75, cancelled: 10, inProgress: 32 },
    { day: "T4", done: 90, cancelled: 6, inProgress: 25 },
    { day: "T5", done: 84, cancelled: 9, inProgress: 27 },
    { day: "T6", done: 95, cancelled: 4, inProgress: 22 },
  ];
  const chartData = range === "week" ? weekData : range === "month" ? monthData : allData;
  const chartTitle =
    range === "week"
      ? "Thống kê theo tuần"
      : range === "month"
        ? "Thống kê theo tháng"
        : "Thống kê tổng quan";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Select value={range} onValueChange={(v) => setRange(v as any)}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Theo tuần</SelectItem>
            <SelectItem value="month">Theo tháng</SelectItem>
            <SelectItem value="all">Tổng quan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{chartTitle}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="done" fill="var(--success)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="inProgress" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cancelled" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bổ theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tỷ lệ hoàn thành tổng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="font-display text-4xl font-bold text-primary">{completion}%</span>
              <Progress value={completion} className="h-3 flex-1" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {tasks.filter((t) => t.status === "done").length}/{tasks.length} task đã hoàn thành
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TasksPage() {
  const [view, setView] = useState("kanban");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("new");

  const openCreateTask = (status: TaskStatus = "new") => {
    setOpenTask(null);
    setCreateStatus(status);
    setCreatingTask(true);
  };

  const openExistingTask = (task: Task) => {
    setCreatingTask(false);
    setOpenTask(task);
  };

  const closeTaskDialog = (open: boolean) => {
    if (open) return;
    setOpenTask(null);
    setCreatingTask(false);
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Quản lý Task</h1>
          <p className="text-sm text-muted-foreground">Trung tâm điều hành mọi mục tiêu của bạn.</p>
        </div>
        <Button className="rounded-xl" onClick={() => openCreateTask()}>
          <Plus className="h-4 w-4" />
          Tạo task
        </Button>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="kanban" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            List
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Thống kê
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="mt-4">
          <KanbanView onOpen={openExistingTask} onCreate={openCreateTask} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <ListView onOpen={openExistingTask} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarView onOpen={openExistingTask} />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <StatsView />
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={!!openTask || creatingTask}
        onOpenChange={closeTaskDialog}
        task={openTask}
        defaultStatus={createStatus}
      />
    </div>
  );
}
