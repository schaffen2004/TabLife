import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckSquare, Wallet, FolderKanban, Microscope, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskDialog } from "@/components/TaskDialog";
import { useStore } from "@/lib/store";
import { formatVND, formatId, type Task } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tổng quan — TabLife" },
      { name: "description", content: "Tổng quan task hôm nay, tài chính, project và research." },
    ],
  }),
  component: Overview,
});

function StatCard({ icon: Icon, label, value, tone = "primary", hint }: any) {
  const toneMap: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    success: "from-success/15 to-success/5 text-success",
    warning: "from-warning/20 to-warning/5 text-warning",
    info: "from-info/15 to-info/5 text-info",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Overview() {
  const { tasks, projects, research, transactions } = useStore();
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(
    (t) => t.deadline === today && t.status !== "done" && t.status !== "cancel",
  );
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const remain = income - expense;
  const activeProjects = projects.filter((p) => p.status === "in_progress");
  const activeResearch = research.filter((r) => r.status === "in_progress");

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Bốn chỉ số quan trọng nhất của bạn hôm nay.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CheckSquare}
          label="Task hôm nay"
          value={String(todayTasks.length)}
          tone="primary"
          hint="Cần xử lý trước hết ngày"
        />
        <StatCard
          icon={Wallet}
          label="Số tiền còn lại"
          value={formatVND(remain)}
          tone="success"
          hint={`Thu ${formatVND(income)} · Chi ${formatVND(expense)}`}
        />
        <StatCard
          icon={FolderKanban}
          label="Project đang thực hiện"
          value={String(activeProjects.length)}
          tone="info"
          hint={`${projects.length} project tổng cộng`}
        />
        <StatCard
          icon={Microscope}
          label="Research đang nghiên cứu"
          value={String(activeResearch.length)}
          tone="warning"
          hint={`${research.length} topic tổng cộng`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task hôm nay cần làm</CardTitle>
            <CardDescription>{todayTasks.length} task có deadline hôm nay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpenTask(t)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                  {String(t.id).padStart(3, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.goal}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.steps.length} bước</p>
                </div>
                <StatusBadge status={t.priority} />
                <StatusBadge status={t.status} />
              </button>
            ))}
            {todayTasks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Không có task hôm nay 🎉</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Project đang thực hiện</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activeProjects.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={p.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-muted-foreground">{p.progress}%</span>
                  </div>
                </div>
              ))}
              {activeProjects.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">Chưa có project nào đang chạy</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Research đang nghiên cứu</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activeResearch.map((r) => (
                <div key={r.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{formatId(r.id)}</span><span>·</span><span>{r.subtopics.length} subtopic</span>
                    <StatusBadge status={r.status} className="ml-1" />
                  </p>
                </div>
              ))}
              {activeResearch.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">Chưa có research đang chạy</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskDialog open={!!openTask} onOpenChange={(o) => !o && setOpenTask(null)} task={openTask} />
    </div>
  );
}
