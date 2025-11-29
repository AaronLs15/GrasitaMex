import { supabaseServer } from "@/lib/supabase/server";
import DashboardCharts from "./dashboard-charts";
import RecentSales from "./recent-sales";
import OrderManager from "./order-manager";

export default async function AdminHome() {
  const supa = await supabaseServer();

  // Fetch data in parallel
  const [
    { count: viewsCount, data: views },
    { count: ordersCount, data: orders },
    { count: customersCount, data: customers },
    { data: recentOrders },
    { data: pendingOrders },
  ] = await Promise.all([
    supa.from("page_views").select("created_at", { count: "exact" }),
    supa
      .from("orders")
      .select("created_at, total_cents, status") // Added total_cents and status
      .in("status", ["paid", "processing", "shipped", "delivered"]),
    supa
      .from("profiles")
      .select("created_at", { count: "exact" })
      .eq("role", "customer"),
    // Recent sales for the sidebar
    supa
      .from("orders")
      .select("*, profiles(email, display_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    // Pending orders for the manager
    supa
      .from("orders")
      .select("*, profiles(email)")
      .in("status", ["paid", "processing", "shipped"])
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  // Calculate Total Sales (from all paid/processing/shipped/delivered)
  const totalSalesCents = orders?.reduce((acc, order) => acc + (order.total_cents || 0), 0) || 0;
  const totalSales = totalSalesCents / 100;

  // Calculate Delivered Orders Count
  const deliveredCount = orders?.filter(o => o.status === 'delivered').length || 0;

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
  const yearDates = getDates(365); // Simplified

  // Helper to aggregate data
  const processData = (dates: Date[]) => {
    return dates.map((d) => {
      let dateStr = "";
      let dayStart: Date, dayEnd: Date;

      // Simple logic: if array length is 7 or 30, treat as days. If 365 (actually we used 12 months in prev code but let's stick to days for consistency or fix logic)
      // The previous code had specific logic for year (months). Let's replicate that structure properly.
      // Actually, let's just use the day logic for week/month and month logic for year.

      const isYear = dates.length === 12; // We'll fix the year generation below to match this expectation if needed, or just use day logic for all if simpler. 
      // But wait, the previous code generated 365 days for yearDates but then mapped 'months' array.
      // Let's stick to the previous logic but add 'sales'.

      // Re-implementing the mapping logic cleanly:
      return { date: "", views: 0, orders: 0, customers: 0, sales: 0 }; // Placeholder, see below
    });
  }

  // Weekly Data (Last 7 days)
  const weeklyData = weekDates.map((d) => {
    const dateStr = d.toLocaleDateString("es-MX", { weekday: "short" });
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));

    const v = views?.filter(x => new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd).length || 0;
    const dayOrders = orders?.filter(x => new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd) || [];

    // Orders count = Only delivered
    const o = dayOrders.filter(x => x.status === 'delivered').length;
    // Sales = All paid+
    const s = dayOrders.reduce((acc, ord) => acc + (ord.total_cents || 0), 0) / 100;

    const c = customers?.filter(x => new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd).length || 0;

    return { date: dateStr, views: v, orders: o, customers: c, sales: s };
  });

  // Monthly Data (Last 30 days)
  const monthlyData = monthDates.map((d) => {
    const dateStr = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));

    const v = views?.filter(x => new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd).length || 0;
    const dayOrders = orders?.filter(x => new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd) || [];

    const o = dayOrders.filter(x => x.status === 'delivered').length;
    const s = dayOrders.reduce((acc, ord) => acc + (ord.total_cents || 0), 0) / 100;

    const c = customers?.filter(x => new Date(x.created_at) >= dayStart && new Date(x.created_at) <= dayEnd).length || 0;

    return { date: dateStr, views: v, orders: o, customers: c, sales: s };
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

    const v = views?.filter(x => new Date(x.created_at) >= monthStart && new Date(x.created_at) <= monthEnd).length || 0;
    const monthOrders = orders?.filter(x => new Date(x.created_at) >= monthStart && new Date(x.created_at) <= monthEnd) || [];

    const o = monthOrders.filter(x => x.status === 'delivered').length;
    const s = monthOrders.reduce((acc, ord) => acc + (ord.total_cents || 0), 0) / 100;

    const c = customers?.filter(x => new Date(x.created_at) >= monthStart && new Date(x.created_at) <= monthEnd).length || 0;

    return { date: dateStr, views: v, orders: o, customers: c, sales: s };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Resumen de actividad y rendimiento.
        </p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Ventas Totales</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totalSales)}
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Pedidos Completados</h3>
          <p className="text-2xl font-bold">{deliveredCount}</p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Clientes Totales</h3>
          <p className="text-2xl font-bold">{customersCount || 0}</p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <h3 className="text-sm font-medium text-muted-foreground">Vistas Totales</h3>
          <p className="text-2xl font-bold">{viewsCount || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        {/* Main Charts Area (Left) */}
        <div className="lg:col-span-4 space-y-6">
          <DashboardCharts
            weeklyData={weeklyData}
            monthlyData={monthlyData}
            yearlyData={yearlyData}
          />
          <OrderManager initialOrders={pendingOrders || []} />
        </div>

        {/* Sidebar (Right) */}
        <div className="lg:col-span-3 space-y-6">
          <RecentSales initialSales={recentOrders || []} />
        </div>
      </div>
    </div>
  );
}
