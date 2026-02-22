import { supabaseServer } from "@/lib/supabase/server";
import DashboardCharts from "./dashboard-charts";
import RecentSales from "./recent-sales";
import OrderManager from "./order-manager";

type DashboardPoint = {
  date: string;
  views: number;
  orders: number;
  customers: number;
  sales: number;
  earnings: number;
};

type CategoryEarning = {
  category: string;
  earnings: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizePoint(value: unknown): DashboardPoint {
  const item = asRecord(value);
  return {
    date: typeof item.date === "string" ? item.date : "",
    views: toNumber(item.views),
    orders: toNumber(item.orders),
    customers: toNumber(item.customers),
    sales: toNumber(item.sales),
    earnings: toNumber(item.earnings),
  };
}

function normalizeCategory(value: unknown): CategoryEarning {
  const item = asRecord(value);
  return {
    category: typeof item.category === "string" ? item.category : "Sin categoría",
    earnings: toNumber(item.earnings),
  };
}

function parseDateSafe(raw: string): Date | null {
  if (!raw) return null;

  const asDay = new Date(`${raw}T00:00:00`);
  if (!Number.isNaN(asDay.getTime())) return asDay;

  const asMonth = new Date(`${raw}-01T00:00:00`);
  if (!Number.isNaN(asMonth.getTime())) return asMonth;

  return null;
}

function formatWeeklyLabel(raw: string): string {
  const date = parseDateSafe(raw);
  return date
    ? date.toLocaleDateString("es-MX", { weekday: "short" })
    : raw;
}

function formatMonthlyLabel(raw: string): string {
  const date = parseDateSafe(raw);
  return date
    ? date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    : raw;
}

function formatYearlyLabel(raw: string): string {
  const date = parseDateSafe(raw);
  return date
    ? date.toLocaleDateString("es-MX", { month: "short", year: "2-digit" })
    : raw;
}

export default async function AdminHome() {
  const supa = await supabaseServer();

  const [
    { data: snapshotData, error: snapshotError },
    { data: recentOrders },
    { data: pendingOrders },
  ] = await Promise.all([
    supa.rpc("get_admin_dashboard_snapshot"),
    supa
      .from("orders")
      .select("*, profiles(email, display_name), addresses:shipping_address_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supa
      .from("orders")
      .select("*, profiles(email), addresses:shipping_address_id(full_name)")
      .in("status", ["paid", "processing", "shipped"])
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  if (snapshotError) {
    console.error("Error fetching dashboard snapshot:", snapshotError);
  }

  const snapshotValue = Array.isArray(snapshotData)
    ? snapshotData[0]
    : snapshotData;
  const snapshot = asRecord(snapshotValue);
  const totalsRaw = asRecord(snapshot.totals);

  const totalSales = toNumber(totalsRaw.total_sales_cents) / 100;
  const totalNetEarnings = toNumber(totalsRaw.total_net_earnings_cents) / 100;
  const deliveredCount = toNumber(totalsRaw.delivered_count);
  const customersCount = toNumber(totalsRaw.customers);
  const viewsCount = toNumber(totalsRaw.views);

  const weeklyData = asArray(snapshot.weekly)
    .map(normalizePoint)
    .map((point) => ({ ...point, date: formatWeeklyLabel(point.date) }));

  const monthlyData = asArray(snapshot.monthly)
    .map(normalizePoint)
    .map((point) => ({ ...point, date: formatMonthlyLabel(point.date) }));

  const yearlyData = asArray(snapshot.yearly)
    .map(normalizePoint)
    .map((point) => ({ ...point, date: formatYearlyLabel(point.date) }));

  const categoryEarnings = asArray(snapshot.category_earnings).map(
    normalizeCategory
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">Resumen de actividad y rendimiento.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Ventas Totales</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: "MXN",
            }).format(totalSales)}
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Earnings Netos (Online + POS)</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: "MXN",
            }).format(totalNetEarnings)}
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Pedidos Completados</h3>
          <p className="text-2xl font-bold">{deliveredCount}</p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Clientes Totales</h3>
          <p className="text-2xl font-bold">{customersCount}</p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Vistas Totales</h3>
          <p className="text-2xl font-bold">{viewsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-6">
          <DashboardCharts
            weeklyData={weeklyData}
            monthlyData={monthlyData}
            yearlyData={yearlyData}
            categoryEarnings={categoryEarnings}
          />
          <OrderManager initialOrders={pendingOrders || []} />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <RecentSales initialSales={recentOrders || []} />
        </div>
      </div>
    </div>
  );
}
