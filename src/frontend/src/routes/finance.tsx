import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useStore } from "@/lib/store";
import { formatVND, formatId, type Transaction } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance — TabLife" },
      { name: "description", content: "Quản lý thu chi và phân bổ ngân sách." },
    ],
  }),
  component: FinancePage,
});

const colors = ["var(--primary)", "var(--info)", "var(--success)", "var(--warning)", "var(--destructive)", "var(--primary-glow)", "var(--muted-foreground)"];

const incomeCategories = [
  { value: "salary", label: "Lương" },
  { value: "freelance", label: "Freelance" },
  { value: "business", label: "Kinh doanh" },
  { value: "gift", label: "Quà tặng" },
  { value: "allowance", label: "Trợ cấp" },
  { value: "other", label: "Khác" },
];

const expenseCategories = [
  { value: "housing", label: "Nhà ở" },
  { value: "food_and_drink", label: "Ăn uống" },
  { value: "transportation", label: "Di chuyển" },
  { value: "healthcare", label: "Sức khoẻ" },
  { value: "education", label: "Học tập" },
  { value: "technology", label: "Công nghệ" },
  { value: "entertainment", label: "Giải trí" },
  { value: "social_relationships", label: "Quan hệ xã hội" },
  { value: "family", label: "Gia đình" },
  { value: "unexpected_expenses", label: "Phát sinh" },
  { value: "other", label: "Khác" },
];

const categoryLabels = Object.fromEntries(
  [...incomeCategories, ...expenseCategories].map((category) => [category.value, category.label]),
);

const monthLabels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
}

function categoryLabel(category: string) {
  return categoryLabels[category] ?? category;
}

function TxDialog({ open, onOpenChange, defaultType, transaction }: { open: boolean; onOpenChange: (o: boolean) => void; defaultType: Transaction["type"]; transaction: Transaction | null }) {
  const { addTransaction, updateTransaction } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(defaultType === "income" ? "salary" : "food_and_drink");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const categoryOptions = type === "income" ? incomeCategories : expenseCategories;

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(formatAmountInput(String(transaction.amount)));
      setCategory(transaction.category);
      setDate(transaction.date);
      setNote(transaction.note ?? "");
      return;
    }

    if (open) {
      setType(defaultType);
      setAmount("");
      setCategory(defaultType === "income" ? "salary" : "food_and_drink");
      setDate(today);
      setNote("");
    }
  }, [defaultType, open, today, transaction]);

  useEffect(() => {
    if (!categoryOptions.some((option) => option.value === category)) {
      setCategory(categoryOptions[0]?.value ?? "other");
    }
  }, [category, categoryOptions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{transaction ? "Chỉnh sửa giao dịch" : "Thêm giao dịch"}</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const n = Number(amount.replace(/[^\d]/g, ""));
            if (!n) return;
            try {
              if (transaction) {
                await updateTransaction(
                  transaction.id,
                  { type, amount: n, category, date, note: note || undefined },
                  transaction.type,
                );
                toast.success("Đã cập nhật giao dịch");
              } else {
                await addTransaction({ type, amount: n, category, date, note: note || undefined });
                toast.success("Đã thêm giao dịch");
              }
              onOpenChange(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Không lưu được giao dịch");
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loại</Label>
              <Select value={type} onValueChange={(value) => setType(value as Transaction["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Thu</SelectItem>
                  <SelectItem value="expense">Chi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ngày</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Số tiền (VND)</Label>
            <Input
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(formatAmountInput(event.target.value))}
              placeholder="VD: 500.000"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Danh mục</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="(tuỳ chọn)" />
          </div>
          <DialogFooter><Button type="submit">{transaction ? "Lưu thay đổi" : "Thêm"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FinancePage() {
  const { transactions, deleteTransaction } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<"income" | "expense">("expense");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [periodTouched, setPeriodTouched] = useState(false);

  useEffect(() => {
    if (periodTouched || transactions.length === 0) return;
    const latest = transactions.reduce((max, transaction) => transaction.date > max ? transaction.date : max, transactions[0].date);
    const [year, month] = latest.split("-").map(Number);
    setSelectedYear(year);
    setSelectedMonth(month);
  }, [periodTouched, transactions]);

  const yearOptions = useMemo(() => {
    const years = new Set(transactions.map((transaction) => Number(transaction.date.slice(0, 4))));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [now, transactions]);

  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(selectedMonthKey)),
    [selectedMonthKey, transactions],
  );

  const chartData = useMemo(() => {
    const rows = monthLabels.map((month, index) => ({
      month,
      income: 0,
      expense: 0,
      incomeRaw: 0,
      expenseRaw: 0,
    }));

    transactions.forEach((transaction) => {
      const [year, month] = transaction.date.split("-").map(Number);
      if (year !== selectedYear || month < 1 || month > 12) return;
      const row = rows[month - 1];
      const key = transaction.type === "income" ? "incomeRaw" : "expenseRaw";
      row[key] += transaction.amount;
      row[transaction.type] = Math.round((row[key] / 1_000_000) * 10) / 10;
    });

    return rows;
  }, [selectedYear, transactions]);

  const income = monthlyTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthlyTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const remain = income - expense;
  const savingRate = income ? Math.round((remain / income) * 100) : 0;

  const byCategory: Record<string, number> = {};
  monthlyTransactions.filter((t) => t.type === "expense").forEach((t) => {
    const label = categoryLabel(t.category);
    byCategory[label] = (byCategory[label] ?? 0) + t.amount;
  });
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  const open = (type: "income" | "expense") => {
    setEditingTransaction(null);
    setDefaultType(type);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground">Tài chính cá nhân tháng {selectedMonth} / {selectedYear}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={String(selectedMonth)}
            onValueChange={(value) => {
              setPeriodTouched(true);
              setSelectedMonth(Number(value));
            }}
          >
            <SelectTrigger className="h-10 w-[116px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthLabels.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>Tháng {index + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => {
              setPeriodTouched(true);
              setSelectedYear(Number(value));
            }}
          >
            <SelectTrigger className="h-10 w-[104px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl" onClick={() => open("income")}><ArrowDownLeft className="h-4 w-4 text-success" />Thu</Button>
          <Button variant="outline" className="rounded-xl" onClick={() => open("expense")}><ArrowUpRight className="h-4 w-4 text-destructive" />Chi</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: TrendingUp, label: "Tổng thu", value: formatVND(income), tone: "success" },
          { icon: TrendingDown, label: "Tổng chi", value: formatVND(expense), tone: "destructive" },
          { icon: Wallet, label: "Còn lại", value: formatVND(remain), tone: "primary" },
          { icon: PiggyBank, label: "Tỷ lệ tiết kiệm", value: `${savingRate}%`, tone: "info" },
        ].map((s, i) => {
          const tones: Record<string, string> = {
            success: "from-success/20 to-success/5 text-success",
            destructive: "from-destructive/20 to-destructive/5 text-destructive",
            primary: "from-primary/20 to-primary/5 text-primary",
            info: "from-info/20 to-info/5 text-info",
          };
          return (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
                  </div>
                  <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${tones[s.tone]}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thu - chi theo tháng</CardTitle>
            <CardDescription>Dữ liệu thực năm {selectedYear}, đơn vị: triệu VND</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatVND(Number(value) * 1_000_000),
                    name === "income" ? "Thu" : "Chi",
                  ]}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                />
                <Bar dataKey="income" fill="var(--success)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Chi theo danh mục</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatVND(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lịch sử giao dịch</CardTitle>
            <CardDescription>{monthlyTransactions.length} giao dịch trong tháng</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => open("expense")}><Plus className="h-3.5 w-3.5" />Thêm</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyTransactions.map((t) => (
                <TableRow key={`${t.type}-${t.id}`} className="group cursor-pointer" onClick={() => { setEditingTransaction(t); setDialogOpen(true); }}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{formatId(t.id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.date}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      {t.type === "income" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {t.type === "income" ? "Thu" : "Chi"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{categoryLabel(t.category)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.note ?? "—"}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${
                    t.type === "income" ? "text-success" : "text-destructive"
                  }`}>
                    {t.type === "income" ? "+" : "-"}{formatVND(t.amount)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={async (event) => {
                        event.stopPropagation();
                        try {
                          await deleteTransaction(t.id, t.type);
                          toast.success("Đã xoá");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Không xoá được giao dịch");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TxDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultType={defaultType} transaction={editingTransaction} />
    </div>
  );
}
