import { supabaseServer } from "@/lib/supabase/server";
import DashboardCharts from "./dashboard-charts";

export default async function AdminHome() {
  const supa = await supabaseServer();

  // Fetch data in parallel
  const [
    { count: viewsCount, data: views },
    { count: ordersCount, data: orders },
    { count: customersCount, data: customers },
  ] = await Promise.all([
    supa.from("page_views").select("created_at", { count: "exact" }),
    supa
      .from("orders")
      .select("created_at", { count: "exact" })
      .in("status", ["paid", "processing", "shipped", "delivered"]),
    supa
      .from("profiles")
      .select("created_at", { count: "exact" })
      .eq("role", "customer"),
  ]);

  // Helper to aggregate data
  const aggregateData = (
    data: any[],
    formatDate: (date: Date) => string
  ) => {
    const map = new Map<string, number>();
    data.forEach((item) => {
      const date = formatDate(new Date(item.created_at));
      map.set(date, (map.get(date) || 0) + 1);
    });
    return map;
  };

  // Generate date ranges
  const now = new Date();
  const getDates = (days: number) => {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getDates(7);
  const monthDates = getDates(30);
  const yearDates = getDates(365); // Simplified, usually grouped by month

  // Weekly Data (Last 7 days)
  const weeklyData = weekDates.map((d) => {
    const dateStr = d.toLocaleDateString("es-MX", { weekday: "short" });
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));

    const v = views?.filter(
      (x) =>
        new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd
    ).length;
    const o = orders?.filter(
      (x) =>
        new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd
    ).length;
    const c = customers?.filter(
      (x) =>
        new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd
    ).length;

    return { date: dateStr, views: v || 0, orders: o || 0, customers: c || 0 };
  });

  // Monthly Data (Last 30 days)
  const monthlyData = monthDates.map((d) => {
    const dateStr = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));

    const v = views?.filter(
      (x) =>
        new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd
    ).length;
    const o = orders?.filter(
      (x) =>
        new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd
    ).length;
    const c = customers?.filter(
      (x) =>
        new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd
    ).length;

    return { date: dateStr, views: v || 0, orders: o || 0, customers: c || 0 };
  });

  // Yearly Data (Last 12 months)
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(now.getMonth() - i);
    months.push(d);
  }

  const yearlyData = months.map((d) => {
    const dateStr = d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const v = views?.filter(
      (x) =>
        new Date(x.created_at) >= monthStart && new Date(x.created_at) <= monthEnd
    ).length;
    const o = orders?.filter(
      (x) =>
        new Date(x.created_at) >= monthStart && new Date(x.created_at) <= monthEnd
    ).length;
    const c = customers?.filter(
      (x) =>
        new Date(x.created_at) >= monthStart && new Date(x.created_at) <= monthEnd
    ).length;

    return { date: dateStr, views: v || 0, orders: o || 0, customers: c || 0 };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Resumen de actividad y rendimiento.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Total Vistas</h3>
          <p className="text-2xl font-bold">{viewsCount || 0}</p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Pedidos Completados</h3>
          <p className="text-2xl font-bold">{ordersCount || 0}</p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Clientes Totales</h3>
          <p className="text-2xl font-bold">{customersCount || 0}</p>
        </div>
      </div>

      <DashboardCharts
        weeklyData={weeklyData}
        monthlyData={monthlyData}
        yearlyData={yearlyData}
      />
    </div>
  );
}
