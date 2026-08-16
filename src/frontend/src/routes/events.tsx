import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { ColoredStatusSelect, eventStatusOptions } from "@/components/ColoredStatusSelect";
import { useStore } from "@/lib/store";
import { formatId, type LifeEvent } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Event — TabLife" },
      { name: "description", content: "Lịch sự kiện, cuộc hẹn và các mốc trong ngày." },
    ],
  }),
  component: EventsPage,
});

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

const eventStatusFilterOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  ...eventStatusOptions,
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function todayKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatViDateFull(value?: string): string {
  const date = parseIsoDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeRange(event: LifeEvent): string {
  const start = event.startTime.slice(0, 5);
  const end = event.endTime?.slice(0, 5);
  return end ? `${start} – ${end}` : start;
}

function eventChipClass(status: LifeEvent["status"]): string {
  if (status === "done") return "bg-success/15 text-success";
  if (status === "cancel") return "bg-muted text-muted-foreground line-through";
  return "bg-info/15 text-info";
}

function EventFormFields({
  name,
  setName,
  description,
  setDescription,
  location,
  setLocation,
  date,
  setDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  status,
  setStatus,
  showStatus = false,
}: {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  status: LifeEvent["status"];
  setStatus: (value: LifeEvent["status"]) => void;
  showStatus?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Tên sự kiện *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Mô tả</Label>
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Địa điểm</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="VD: Google Meet, quán cafe..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ngày *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        {showStatus ? (
          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <ColoredStatusSelect
              value={status}
              onValueChange={(value) => setStatus(value as LifeEvent["status"])}
              options={eventStatusOptions}
            />
          </div>
        ) : (
          <div />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Giờ bắt đầu *</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Giờ kết thúc</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
    </>
  );
}

function NewEventDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
}) {
  const addEvent = useStore((s) => s.addEvent);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<LifeEvent["status"]>("upcoming");

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setStartTime("09:00");
      setEndTime("");
      setStatus("upcoming");
    }
  }, [defaultDate, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Event mới</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await addEvent({
              name,
              description,
              location: location.trim() || undefined,
              date,
              startTime,
              endTime: endTime || undefined,
              status: "upcoming",
            });
            toast.success("Đã tạo event");
            setName("");
            setDescription("");
            setLocation("");
            onOpenChange(false);
          }}
        >
          <EventFormFields
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            location={location}
            setLocation={setLocation}
            date={date}
            setDate={setDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            status={status}
            setStatus={setStatus}
          />
          <DialogFooter>
            <Button type="submit">Tạo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEventDialog({ event, onClose }: { event: LifeEvent | null; onClose: () => void }) {
  const { updateEvent, deleteEvent } = useStore();
  const [draft, setDraft] = useState<LifeEvent | null>(event);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraft(event);
    setIsEditing(false);
  }, [event]);

  if (!draft) return null;

  const cancelEdit = () => {
    setDraft(event);
    setIsEditing(false);
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {formatId(draft.id)}
            </span>
            <StatusBadge status={draft.status} />
          </div>
          <DialogTitle className="pt-1 font-display text-2xl">
            {isEditing ? "Chỉnh sửa Event" : draft.name}
          </DialogTitle>
        </DialogHeader>
        {isEditing ? (
          <div className="space-y-3">
            <EventFormFields
              name={draft.name}
              setName={(name) => setDraft({ ...draft, name })}
              description={draft.description}
              setDescription={(description) => setDraft({ ...draft, description })}
              location={draft.location ?? ""}
              setLocation={(location) => setDraft({ ...draft, location })}
              date={draft.date}
              setDate={(date) => setDraft({ ...draft, date })}
              startTime={draft.startTime}
              setStartTime={(startTime) => setDraft({ ...draft, startTime })}
              endTime={draft.endTime ?? ""}
              setEndTime={(endTime) => setDraft({ ...draft, endTime: endTime || undefined })}
              status={draft.status}
              setStatus={(status) => setDraft({ ...draft, status })}
              showStatus
            />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Thời gian</p>
              <p className="mt-1">
                {formatViDateFull(draft.date)} · {formatTimeRange(draft)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Địa điểm</p>
              <p className="mt-1">{draft.location || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Mô tả</p>
              <p className="mt-1 whitespace-pre-wrap">{draft.description || "—"}</p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          {isEditing ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                await deleteEvent(draft.id);
                toast.success("Đã xoá event");
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Xoá
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>
                  Huỷ
                </Button>
                <Button
                  onClick={async () => {
                    await updateEvent(draft.id, {
                      ...draft,
                      location: draft.location?.trim() || "",
                      endTime: draft.endTime || "",
                    });
                    toast.success("Đã lưu");
                    setIsEditing(false);
                  }}
                >
                  Lưu thay đổi
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventRow({ event, onOpen }: { event: LifeEvent; onOpen: (event: LifeEvent) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
        {event.startTime.slice(0, 5)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium">{event.name}</p>
          <StatusBadge status={event.status} className="shrink-0" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatTimeRange(event)}</p>
        {event.location && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {event.location}
          </p>
        )}
      </div>
    </button>
  );
}

function EventsPage() {
  const events = useStore((s) => s.events);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<LifeEvent | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (status !== "all" && event.status !== status) return false;
      if (!q) return true;
      return (
        event.name.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        (event.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, query, status]);

  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const selectedEvents = filtered
    .filter((event) => event.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcoming = filtered
    .filter((event) => event.status === "upcoming" && event.date >= todayKey())
    .slice(0, 8);

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Event</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý cuộc hẹn, sự kiện và lịch trong ngày.
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" />
          Event mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm event..."
            className="h-10 pl-9"
          />
        </div>
        <ColoredStatusSelect
          value={status}
          onValueChange={setStatus}
          options={eventStatusFilterOptions}
          className="h-10 w-[170px]"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Tháng {cursor.month + 1} / {cursor.year}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  const now = new Date();
                  setCursor({ year: now.getFullYear(), month: now.getMonth() });
                  setSelectedDate(todayKey());
                }}
              >
                Hôm nay
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                const dateKey = day ? toDateKey(cursor.year, cursor.month, day) : "";
                const dayEvents = day ? filtered.filter((event) => event.date === dateKey) : [];
                const isToday = dateKey === todayKey();
                const isSelected = dateKey === selectedDate;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!day}
                    onClick={() => day && setSelectedDate(dateKey)}
                    className={cn(
                      "min-h-[92px] rounded-lg border p-1.5 text-left text-xs",
                      day ? "bg-card hover:border-primary/40" : "border-transparent bg-transparent",
                      isToday && "border-primary ring-1 ring-primary/40",
                      isSelected && day && "border-primary bg-primary/5",
                    )}
                  >
                    {day && (
                      <>
                        <div
                          className={cn(
                            "mb-1 text-right font-medium",
                            isToday || isSelected ? "text-primary" : "",
                          )}
                        >
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <span
                              key={event.id}
                              className={cn(
                                "block truncate rounded px-1.5 py-0.5 text-[10px]",
                                eventChipClass(event.status),
                              )}
                            >
                              {event.startTime.slice(0, 5)} {event.name}
                            </span>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayEvents.length - 2}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{formatViDateFull(selectedDate)}</CardTitle>
            <CardDescription>{selectedEvents.length} sự kiện trong ngày</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedEvents.map((event) => (
              <EventRow key={event.id} event={event} onOpen={setEditing} />
            ))}
            {selectedEvents.length === 0 && (
              <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                Không có event ngày này
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-semibold">Sắp diễn ra</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {upcoming.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setEditing(event)}
              className="text-left"
            >
              <Card className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-primary-glow/15 text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                    {formatId(event.id)}
                  </div>
                  <CardTitle className="mt-1">{event.name}</CardTitle>
                  <CardDescription>
                    {formatViDateFull(event.date)} · {formatTimeRange(event)}
                  </CardDescription>
                </CardHeader>
                {event.location && (
                  <CardContent>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {event.location}
                    </p>
                  </CardContent>
                )}
              </Card>
            </button>
          ))}
          {upcoming.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
              Chưa có event sắp diễn ra
            </p>
          )}
        </div>
      </div>

      <NewEventDialog open={openNew} onOpenChange={setOpenNew} defaultDate={selectedDate} />
      <EditEventDialog event={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
