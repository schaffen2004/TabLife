import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Flame, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/routine")({
  head: () => ({
    meta: [
      { title: "Daily Routine — TabLife" },
      { name: "description", content: "Thói quen hằng ngày và streak của bạn." },
    ],
  }),
  component: RoutinePage,
});

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(dateInWeek: Date) {
  const monday = new Date(dateInWeek);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDateKeys(weekStart: Date) {
  return dayLabels.map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return formatLocalDate(date);
  });
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return `${formatLocalDate(weekStart)} - ${formatLocalDate(weekEnd)}`;
}

function RoutinePage() {
  const { routines, toggleRoutine, addRoutine, deleteRoutine } = useStore();
  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState("");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [weekDoneCounts, setWeekDoneCounts] = useState<number[]>(() => Array(7).fill(0));
  const done = routines.filter((r) => r.doneToday).length;
  const percent = routines.length ? Math.round((done / routines.length) * 100) : 0;
  const weekDateKeys = useMemo(() => getWeekDateKeys(weekStart), [weekStart]);
  const weekData = useMemo(
    () =>
      dayLabels.map((day, index) => ({
        day,
        percent: routines.length
          ? Math.round(((weekDoneCounts[index] ?? 0) / routines.length) * 100)
          : 0,
      })),
    [routines.length, weekDoneCounts],
  );

  useEffect(() => {
    const counts = Array(7).fill(0);
    routines.forEach((routine) => {
      routine.weekHistory.forEach((isDone, index) => {
        if (weekDateKeys[index] && isDone) {
          counts[index] += 1;
        }
      });
    });
    setWeekDoneCounts(counts);
  }, [routines, weekDateKeys]);

  const moveWeek = (offset: number) => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + offset * 7);
      return next;
    });
  };

  const selectWeek = (value: string) => {
    setWeekStart(getWeekStart(parseLocalDate(value)));
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Daily Routine</h1>
          <p className="text-sm text-muted-foreground">Những thói quen nhỏ tạo nên thay đổi lớn.</p>
        </div>
        <Button className="rounded-xl" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" />
          Routine mới
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-1">
          <div className="bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground">
            <p className="text-sm opacity-90">Hôm nay</p>
            <div className="mt-1 flex items-end justify-between">
              <div>
                <p className="font-display text-5xl font-bold">{percent}%</p>
                <p className="mt-1 text-sm opacity-90">
                  {done}/{routines.length} routine
                </p>
              </div>
              <div className="text-right">
                <Flame className="ml-auto h-8 w-8" />
                <p className="mt-1 text-xs opacity-90">
                  streak cao nhất {Math.max(0, ...routines.map((r) => r.streak))} ngày
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Hoàn thành theo tuần</CardTitle>
              <CardDescription>{formatWeekRange(weekStart)}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => moveWeek(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={formatLocalDate(weekStart)}
                onChange={(event) => selectWeek(event.target.value)}
                className="h-9 w-[150px]"
              />
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => moveWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Hoàn thành"]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Routine hôm nay</CardTitle>
          <CardDescription>Check-in mỗi khi hoàn thành</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {routines.map((r) => (
            <div
              key={r.id}
              className="group flex items-center gap-4 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/30"
            >
              <button
                onClick={async () => {
                  try {
                    await toggleRoutine(r.id);
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Không cập nhật được trạng thái routine",
                    );
                  }
                }}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 transition-all ${
                  r.doneToday
                    ? "border-success bg-success text-success-foreground"
                    : "border-border hover:border-primary"
                }`}
              >
                {r.doneToday && <Check className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium ${r.doneToday ? "line-through text-muted-foreground" : ""}`}
                >
                  {r.name}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  {r.weekHistory.map((d, i) => (
                    <div
                      key={i}
                      title={dayLabels[i]}
                      className={`h-1.5 w-6 rounded-full ${d ? "bg-success" : "bg-muted"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-bold text-primary">
                  <Flame className="h-3.5 w-3.5 fill-orange-500/20 text-orange-500" /> {r.streak}
                </div>
                <p className="text-[10px] text-muted-foreground">ngày</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={async () => {
                  try {
                    await deleteRoutine(r.id);
                    toast.success("Đã xoá routine");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Không xoá được routine");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Routine mới</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              try {
                await addRoutine(name.trim());
                setName("");
                setOpenNew(false);
                toast.success("Đã thêm routine");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thêm được routine");
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label>Tên routine *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Đọc 30 phút"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit">Tạo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
