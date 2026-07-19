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
import {
  fetchSettings,
  sendTestTelegramMessage,
  type BackendSettings,
  updateSettings as updateSettingsApi,
} from "@/lib/api";

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
};

const defaultSettings: AppSettings = {
  notification: false,
  today_task: false,
  daily_routine_report: false,
  finance_alert: false,
  schedule_for_tomorrow: false,
  today_task_time: "09:00",
  daily_routine_report_time: "23:00",
  finance_report_time: "20:00",
  schedule_for_tomorrow_time: "23:00",
  timezone: "Asia/Ho_Chi_Minh",
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
    today_task_time: settings.today_task_time || defaultSettings.today_task_time,
    daily_routine_report_time:
      settings.daily_routine_report_time || defaultSettings.daily_routine_report_time,
    finance_report_time: settings.finance_report_time || defaultSettings.finance_report_time,
    schedule_for_tomorrow_time:
      settings.schedule_for_tomorrow_time || defaultSettings.schedule_for_tomorrow_time,
    timezone: settings.timezone || defaultSettings.timezone,
    chat_id: String(settings.chat_id ?? ""),
    token: settings.token ?? "",
  };
}

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const isTelegramConnected = Boolean(settings.token && settings.chat_id);
  const notificationDisabled = isLoading || isSaving || !settings.notification;

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSettings();
        if (!cancelled) {
          setSettings(normalizeSettings(data));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? `Không tải được settings từ API: ${error.message}`
              : "Không tải được settings từ API",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async (
    nextSettings: AppSettings,
    showSuccess = false,
    patch?: Partial<BackendSettings>,
  ) => {
    setIsSaving(true);
    try {
      const savedSettings = await updateSettingsApi(
        patch ?? {
          notification: nextSettings.notification,
          today_task: nextSettings.today_task,
          daily_routine_report: nextSettings.daily_routine_report,
          finance_alert: nextSettings.finance_alert,
          schedule_for_tomorrow: nextSettings.schedule_for_tomorrow,
          today_task_time: nextSettings.today_task_time,
          daily_routine_report_time: nextSettings.daily_routine_report_time,
          finance_report_time: nextSettings.finance_report_time,
          schedule_for_tomorrow_time: nextSettings.schedule_for_tomorrow_time,
          timezone: nextSettings.timezone,
          language: nextSettings.language,
          chat_id: nextSettings.chat_id,
          token: nextSettings.token,
        },
      );
      setSettings(normalizeSettings(savedSettings));
      if (showSuccess) toast.success("Đã lưu cài đặt giao diện");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không lưu được cài đặt từ API");
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

    const saved = await saveSettings(nextSettings, false, {
      [key]: value,
    } as Partial<BackendSettings>);
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
          today_task: false,
          daily_routine_report: false,
          finance_alert: false,
          schedule_for_tomorrow: false,
        };

    setSettings(nextSettings);

    const saved = await saveSettings(nextSettings, false, {
      notification: nextSettings.notification,
      today_task: nextSettings.today_task,
      daily_routine_report: nextSettings.daily_routine_report,
      finance_alert: nextSettings.finance_alert,
      schedule_for_tomorrow: nextSettings.schedule_for_tomorrow,
    });
    if (!saved) {
      setSettings(previousSettings);
    }
  };

  const sendTestNotification = async () => {
    const token = settings.token.trim();
    const chatId = String(settings.chat_id).trim();

    if (!token || !chatId) {
      toast.error("Cần nhập Bot Token và Chat ID trước khi gửi thử");
      return;
    }

    setIsSendingTest(true);
    try {
      const saved = await saveSettings({ ...settings, token, chat_id: chatId }, false, {
        token,
        chat_id: chatId,
      });
      if (!saved) {
        return;
      }

      await sendTestTelegramMessage(
        "TabLife test notification\n\nNeu ban nhan duoc tin nhan nay, ket noi Telegram da hoat dong.",
      );
      toast.success("Đã gửi thông báo thử tới Telegram");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không gửi được thông báo thử tới Telegram",
      );
    } finally {
      setIsSendingTest(false);
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
            Đang tải cài đặt từ API...
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
          hint={`Mô phỏng nhắc việc lúc ${settings.today_task_time}`}
          checked={settings.today_task}
          disabled={isLoading || isSaving}
          onCheckedChange={(checked) => updateSetting("today_task", checked, true)}
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="deadline-day-time">Giờ nhắc task hôm nay</Label>
              <p className="text-xs text-muted-foreground">
                Thay đổi sẽ được lưu trực tiếp vào backend.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-40">
            <Input
              id="deadline-day-time"
              type="time"
              value={settings.today_task_time}
              disabled={notificationDisabled || !settings.today_task}
              onChange={(event) => updateSetting("today_task_time", event.target.value)}
            />
          </div>
        </div>
        <ToggleRow
          label="Schedule for tomorrow"
          hint={`Gửi lịch ngày mai lúc ${settings.schedule_for_tomorrow_time}`}
          checked={settings.schedule_for_tomorrow}
          disabled={isLoading || isSaving}
          onCheckedChange={(checked) => updateSetting("schedule_for_tomorrow", checked, true)}
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="schedule-for-tomorrow-time">Giờ gửi lịch ngày mai</Label>
              <p className="text-xs text-muted-foreground">
                Thay đổi sẽ được lưu trực tiếp vào backend.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-40">
            <Input
              id="schedule-for-tomorrow-time"
              type="time"
              value={settings.schedule_for_tomorrow_time}
              disabled={notificationDisabled || !settings.schedule_for_tomorrow}
              onChange={(event) => updateSetting("schedule_for_tomorrow_time", event.target.value)}
            />
          </div>
        </div>
        <ToggleRow
          label="Daily routine"
          hint={`Nhắc cập nhật mỗi ngày lúc ${settings.daily_routine_report_time}`}
          checked={settings.daily_routine_report}
          disabled={isLoading || isSaving}
          onCheckedChange={(checked) => updateSetting("daily_routine_report", checked, true)}
        />
        <div className="rounded-xl border bg-card p-3">
          <div className="space-y-2">
            <Label>Giờ nhắc routine</Label>
            <Input
              type="time"
              value={settings.daily_routine_report_time}
              disabled={notificationDisabled || !settings.daily_routine_report}
              onChange={(event) => updateSetting("daily_routine_report_time", event.target.value)}
            />
          </div>
        </div>
        <ToggleRow
          label="Cảnh báo tài chính"
          hint={`Mô phỏng kiểm tra lúc ${settings.finance_report_time}`}
          checked={settings.finance_alert}
          disabled={isLoading || isSaving}
          onCheckedChange={(checked) => updateSetting("finance_alert", checked, true)}
        />
        <div className="rounded-xl border bg-card p-3">
          <div className="space-y-2">
            <Label>Giờ kiểm tra tài chính</Label>
            <Input
              type="time"
              value={settings.finance_report_time}
              disabled={notificationDisabled || !settings.finance_alert}
              onChange={(event) => updateSetting("finance_report_time", event.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Send}
        title="Telegram UI"
        description="Cấu hình Telegram được lấy và lưu qua API"
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
              disabled={isLoading || isSaving || isSendingTest || !isTelegramConnected}
              onClick={sendTestNotification}
            >
              {isSendingTest ? "Đang gửi..." : "Gửi thử"}
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
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="space-y-2">
            <Label>Múi giờ</Label>
            <Input
              value={settings.timezone}
              onChange={(event) => updateSetting("timezone", event.target.value)}
              placeholder="Asia/Ho_Chi_Minh"
            />
          </div>
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
