"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

type DataPoint = {
    date: string;
    views: number;
    orders: number;
    customers: number;
};

interface DashboardChartsProps {
    weeklyData: DataPoint[];
    monthlyData: DataPoint[];
    yearlyData: DataPoint[];
}

export default function DashboardCharts({
    weeklyData,
    monthlyData,
    yearlyData,
}: DashboardChartsProps) {
    const [period, setPeriod] = useState<"week" | "month" | "year">("week");

    const data =
        period === "week"
            ? weeklyData
            : period === "month"
                ? monthlyData
                : yearlyData;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Resumen</h2>
                <Tabs
                    value={period}
                    onValueChange={(v) => setPeriod(v as any)}
                    className="w-[400px]"
                >
                    <TabsList>
                        <TabsTrigger value="week">Semana</TabsTrigger>
                        <TabsTrigger value="month">Mes</TabsTrigger>
                        <TabsTrigger value="year">Año</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Vistas de Página</CardTitle>
                        <CardDescription>Tráfico del sitio</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="views"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pedidos Completados</CardTitle>
                        <CardDescription>Ventas finalizadas</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip />
                                    <Bar
                                        dataKey="orders"
                                        fill="#82ca9d"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Nuevos Clientes</CardTitle>
                        <CardDescription>Cuentas creadas</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="customers"
                                        stroke="#ffc658"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
