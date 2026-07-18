import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Bell, Clock, Send, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Cài đặt — TabLife" },
      { name: "description", content: "Quản lý thông báo, Telegram và giao diện." },
    ],
  }),
  component: SettingsPage,
});

type AppSettings = {
  notification: boolean;
  deadline: boolean;
  routine: boolean;
  finance: boolean;
  deadline_day_time: string;
  deadline_hour_time: string;
  routine_time: string;
  finance_time: string;
  language: string;
  chat_id: number | string;
  token: string;
};

const SETTINGS_STORAGE_KEY = "tablife-ui-settings";

const defaultSettings: AppSettings = {
  notification: false,
  deadline: false,
  routine: false,
  finance: false,
  deadline_day_time: "09:00",
  deadline_hour_time: "23:00",
  routine_time: "23:00",
  finance_time: "20:00",
  language: "vi",
  chat_id: "",
  token: "",
};

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function normalizeSettings(settings: Partial<AppSettings>): AppSettings {
  return {
    ...defaultSettings,
    ...settings,
    deadline_day_time: settings.deadline_day_time || defaultSettings.deadline_day_time,
    deadline_hour_time: settings.deadline_hour_time || defaultSettings.deadline_hour_time,
    routine_time: settings.routine_time || defaultSettings.routine_time,
    finance_time: settings.finance_time || defaultSettings.finance_time,
    chat_id: String(settings.chat_id ?? ""),
    token: settings.token ?? "",
  };
}

function loadStoredSettings() {
  if (typeof window === "undefined") return defaultSettings;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return defaultSettings;
  }
}

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isTelegramConnected = Boolean(settings.token && settings.chat_id);
  const notificationDisabled = isLoading || isSaving || !settings.notification;

  useEffect(() => {
    setSettings(loadStoredSettings());
    setIsLoading(false);
  }, []);

  const saveSettings = async (nextSettings: AppSettings, showSuccess = false) => {
    setIsSaving(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      }
      setSettings(normalizeSettings(nextSettings));
      if (showSuccess) toast.success("Đã lưu cài đặt giao diện");
      return true;
    } catch {
      toast.error("Không lưu được cài đặt trên trình duyệt này");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = async <Key extends keyof AppSettings>(
    key: Key,
    value: AppSettings[Key],
    persist = false,
  ) => {
    const previousSettings = settings;
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);

    if (!persist) return;

    const saved = await saveSettings(nextSettings);
    if (!saved) {
      setSettings(previousSettings);
    }
  };

  const updateNotification = async (checked: boolean) => {
    const previousSettings = settings;
    const nextSettings = checked
      ? { ...settings, notification: true }
      : {
          ...settings,
          notification: false,
          deadline: false,
          routine: false,
          finance: false,
        };

    setSettings(nextSettings);

    const saved = await saveSettings(nextSettings);
    if (!saved) {
      setSettings(previousSettings);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-sm text-muted-foreground">Tuỳ chỉnh trải nghiệm TabLife của bạn.</p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Đang tải cài đặt cục bộ...
          </CardContent>
        </Card>
      )}

      <SectionCard icon={Bell} title="Thông báo" description="Chọn loại thông báo bạn muốn nhận">
        <ToggleRow
          label="Bật thông báo tổng"
          checked={settings.notification}
          disabled={isLoading || isSaving}
          onCheckedChange={updateNotification}
        />
        <ToggleRow
          label="Task làm hôm nay"
          hint={`Mô phỏng nhắc việc lúc ${settings.deadline_day_time}`}
          checked={settings.deadline}
          disabled={isLoading || isSaving}
          onCheckedChange={(checked) => updateSetting("deadline", checked, true)}
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="deadline-day-time">Giờ nhắc task hôm nay</Label>
              <p className="text-xs text-muted-foreground">
                Đây là cấu hình UI demo, không gửi thông báo ra backend.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-40">
            <Input
              id="deadline-day-time"
              type="time"
              value={settings.deadline_day_time}
              disabled={notificationDisabled || !settings.deadline}
              onChange={(event) => updateSetting("deadline_day_time", event.target.value)}
            />
          </div>
        </div>
        <ToggleRow
          label="Daily routine"
          hint={`Nhắc cập nhật mỗi ngày lúc ${settings.routine_time}`}
          checked={settings.routine}
          disabled={isLoading || isSaving}
          onCheckedChange={(checked) => updateSetting("routine", checked, true)}
        />
        <div className="rounded-xl border bg-card p-3">
          <div className="space-y-2">
            <Label>Giờ nhắc routine</Label>
            <Input
              type="time"
              value={settings.routine_time}
              disabled={notificationDisabled || !settings.routine}
              onChange={(event) => updateSetting("routine_time", event.target.value)}
            />
          </div>
        </div>
        <ToggleRow
          label="Cảnh báo tài chính"
          hint={`Mô phỏng kiểm tra lúc ${settings.finance_time}`}
          checked={settings.finance}
          disabled={isLoading || isSaving}
          onCheckedChange={(checked) => updateSetting("finance", checked, true)}
        />
        <div className="rounded-xl border bg-card p-3">
          <div className="space-y-2">
            <Label>Giờ kiểm tra tài chính</Label>
            <Input
              type="time"
              value={settings.finance_time}
              disabled={notificationDisabled || !settings.finance}
              onChange={(event) => updateSetting("finance_time", event.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Send}
        title="Telegram UI"
        description="Giữ lại form cấu hình để demo giao diện"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <Input
              type="password"
              value={settings.token}
              onChange={(event) => updateSetting("token", event.target.value)}
              placeholder="1234567:ABC-DEF..."
            />
          </div>
          <div className="space-y-2">
            <Label>Chat ID</Label>
            <Input
              value={String(settings.chat_id)}
              onChange={(event) => updateSetting("chat_id", event.target.value)}
              placeholder="123456789"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${isTelegramConnected ? "bg-success" : "bg-muted-foreground"}`}
            />
            <span className="text-sm">
              Trạng thái:{" "}
              <strong>{isTelegramConnected ? "Đã nhập dữ liệu demo" : "Chưa cấu hình"}</strong>
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Đã mô phỏng gửi thông báo")}
            >
              Gửi thử
            </Button>
            <Switch
              checked={settings.notification}
              disabled={isLoading || isSaving}
              onCheckedChange={updateNotification}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Palette} title="Giao diện" description="Ngôn ngữ">
        <div className="space-y-2">
          <Label>Ngôn ngữ</Label>
          <Select
            value={settings.language}
            onValueChange={(value) => updateSetting("language", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vi">Tiếng Việt</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button
          className="rounded-xl"
          disabled={isLoading || isSaving}
          onClick={() => saveSettings(settings, true)}
        >
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}
