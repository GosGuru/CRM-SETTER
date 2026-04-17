"use client";

import { useState } from "react";
import { localDateStr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadCard } from "@/components/lead-card";
import { FupCard } from "@/components/fup-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useFollowUps } from "@/hooks/use-leads";
import { useFollowups, useCompleteFollowup, useDeleteFollowup } from "@/hooks/use-followups";
import { useStats, useKPIHistory } from "@/hooks/use-stats";
import { useCurrentUser } from "@/hooks/use-users";
import { KPIDetailDialog } from "@/components/kpi-detail-dialog";
import type { KPIDetailType } from "@/types/database";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  HiOutlineUserPlus,
  HiOutlinePhoneArrowUpRight,
  HiOutlinePaperAirplane,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineBanknotes,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineBellAlert,
  HiOutlineClipboardDocumentList,
  HiOutlineClipboardDocumentCheck,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { CalendarIcon } from "lucide-react";

const MONTH_NAMES: { value: number; label: string }[] = [
  { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
  { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
];

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function ExportKPIsButton({ profileName }: { profileName?: string | null }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(
        `/api/export/kpis?month=${month}&year=${year}&tz=${encodeURIComponent(timeZone)}`
      );
      if (!res.ok) throw new Error("Error al generar el Excel");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const monthLabel = MONTH_NAMES.find((m) => m.value === month)?.label ?? String(month);
      const safeProfileName = sanitizeFilenamePart(profileName ?? "") || "Perfil";
      a.download = `${safeProfileName}_KPIs_${monthLabel}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel exportado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setLoading(false);
    }
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <Card className="animate-blur-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <HiOutlineArrowDownTray className="h-5 w-5 text-emerald-500" />
          Exportar KPIs — Excel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="export-month" className="text-sm text-muted-foreground whitespace-nowrap">Mes</label>
            <select
              id="export-month"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="export-year" className="text-sm text-muted-foreground whitespace-nowrap">Año</label>
            <select
              id="export-year"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="cursor-pointer bg-emerald-600 hover:bg-emerald-700"
          >
            <HiOutlineArrowDownTray className="mr-1.5 h-4 w-4" />
            {loading ? "Generando…" : "Descargar Excel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  delay,
  onClick,
}: {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`animate-blur-in-scale${delay ? ` stagger-${delay}` : ""} transition-shadow hover:shadow-md${onClick ? " cursor-pointer hover:ring-2 hover:ring-primary/20" : ""}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 py-4 px-5">
        <div className={`rounded-xl p-2.5 ${color} shadow-sm`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">
            {value}
            {suffix && <span className="text-base font-normal text-muted-foreground ml-0.5">{suffix}</span>}
          </p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

function formatFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function DashboardPage() {
  const fecha = useUIStore((s) => s.fechaSeleccionada);
  const setFecha = useUIStore((s) => s.setFechaSeleccionada);
  const { data: stats, isLoading: statsLoading } = useStats(fecha);
  const { data: kpiHistory } = useKPIHistory(7);
  const { data: followUps, isLoading: followUpsLoading } = useFollowUps(fecha);
  const { data: fups, isLoading: fupsLoading } = useFollowups(fecha);
  const completeFup = useCompleteFollowup();
  const deleteFup = useDeleteFollowup();
  const { data: currentUser } = useCurrentUser();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTipo, setDetailTipo] = useState<KPIDetailType | null>(null);
  const [detailFecha, setDetailFecha] = useState(fecha);

  const openDetail = (tipo: KPIDetailType, fechaISO?: string) => {
    setDetailTipo(tipo);
    setDetailFecha(fechaISO ?? fecha);
    setDetailOpen(true);
  };

  const fupsCompletados = fups?.filter((f) => f.completado).length ?? 0;
  const fupsTotal = fups?.length ?? 0;
  const callsSinPagar = followUps?.filter((l) => !l.pago_reunion) ?? [];
  const callsPagaron = followUps?.filter((l) => l.pago_reunion) ?? [];

  const hoy = localDateStr();
  const esHoy = fecha === hoy;

  const kpi = stats?.kpi;

  // Totales de la tabla KPI
  const totals = kpiHistory?.reduce(
    (acc, row) => ({
      inbound: acc.inbound + row.inbound_nuevo,
      fups: acc.fups + row.fups,
      cal: acc.cal + row.calendarios_enviados,
      calls: acc.calls + row.calls_agendadas,
      cash: acc.cash + row.cash_collected,
    }),
    { inbound: 0, fups: 0, cal: 0, calls: 0, cash: 0 }
  );
  const totalTasa =
    totals && totals.inbound > 0
      ? Math.round((totals.calls / totals.inbound) * 100)
      : 0;

  // Data para el chart
  const chartData = kpiHistory?.map((row) => ({
    fecha: formatFecha(row.fecha),
    fechaISO: row.fecha,
    Inbound: row.inbound_nuevo,
    FUPs: row.fups,
    "Cal. Env.": row.calendarios_enviados,
    Agendadas: row.calls_agendadas,
  }));

  const selectedDate = new Date(fecha + "T12:00:00");

  const fechaLabel = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-6">
      <KPIDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tipo={detailTipo}
        fecha={detailFecha}
        fechaLabel={detailFecha === fecha ? fechaLabel : new Date(detailFecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-blur-fade">
        <div>
          <div className="flex items-center gap-3">
            <HiOutlineClipboardDocumentList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {currentUser && (
              <Badge variant="secondary" className="text-xs">
                {currentUser.full_name || currentUser.email} · {currentUser.role === "closer" ? "Closer" : "Setter"}
              </Badge>
            )}
            {stats && (
              <Badge variant="outline" className="text-xs">
                {stats.total_activos} leads activos
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Resumen del día —{" "}
            {new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={() => setFecha(shiftDate(fecha, -1))}
          >
            <HiOutlineChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" className="h-9 w-auto min-w-45 justify-start text-left font-normal cursor-pointer">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(day) => {
                  if (day) {
                    setFecha(localDateStr(day));
                    setCalendarOpen(false);
                  }
                }}
                locale={es}
                defaultMonth={selectedDate}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={() => setFecha(shiftDate(fecha, 1))}
          >
            <HiOutlineChevronRight className="h-4 w-4" />
          </Button>
          {!esHoy && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 cursor-pointer ml-1"
              onClick={() => setFecha(hoy)}
            >
              Hoy
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard
            title="Inbound Nuevo"
            value={kpi?.inbound_nuevo ?? 0}
            icon={HiOutlineUserPlus}
            color="bg-blue-600"
            delay={1}
            onClick={() => openDetail("inbound")}
          />
          <StatCard
            title="FUPS"
            value={kpi?.fups ?? 0}
            icon={HiOutlinePhoneArrowUpRight}
            color="bg-indigo-600"
            delay={2}
            onClick={() => openDetail("fups")}
          />
          <StatCard
            title="Cal. Enviados"
            value={kpi?.calendarios_enviados ?? 0}
            icon={HiOutlinePaperAirplane}
            color="bg-cyan-600"
            delay={3}
            onClick={() => openDetail("cal_enviados")}
          />
          <StatCard
            title="Calls Agendadas"
            value={kpi?.calls_agendadas ?? 0}
            icon={HiOutlineCalendarDays}
            color="bg-amber-600"
            delay={4}
            onClick={() => openDetail("calls_agendadas")}
          />
          <StatCard
            title="Tasa de Agenda"
            value={kpi?.tasa_agenda ?? 0}
            suffix="%"
            icon={HiOutlineChartBarSquare}
            color="bg-emerald-600"
            delay={5}
            onClick={() => openDetail("tasa")}
          />
          <StatCard
            title="Cash Collected"
            value={`$${kpi?.cash_collected ?? 0}`}
            icon={HiOutlineBanknotes}
            color="bg-green-600"
            delay={6}
            onClick={() => openDetail("cash")}
          />
        </div>
      )}

      {/* Tabla KPI del día */}
      <Card className="animate-blur-in stagger-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HiOutlineCalendarDays className="h-5 w-5 text-primary" />
            KPIs del día —{" "}
            {new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpi ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inbound</TableHead>
                    <TableHead>FUPS</TableHead>
                    <TableHead>Cal. Env.</TableHead>
                    <TableHead>Agendadas</TableHead>
                    <TableHead>Tasa %</TableHead>
                    <TableHead>Cash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell
                      className="text-lg font-semibold cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => openDetail("inbound")}
                    >
                      {kpi.inbound_nuevo}
                    </TableCell>
                    <TableCell
                      className="text-lg font-semibold cursor-pointer hover:text-indigo-600 hover:underline"
                      onClick={() => openDetail("fups")}
                    >
                      {kpi.fups}
                    </TableCell>
                    <TableCell
                      className="text-lg font-semibold cursor-pointer hover:text-cyan-600 hover:underline"
                      onClick={() => openDetail("cal_enviados")}
                    >
                      {kpi.calendarios_enviados}
                    </TableCell>
                    <TableCell
                      className="text-lg font-semibold cursor-pointer hover:text-amber-600 hover:underline"
                      onClick={() => openDetail("calls_agendadas")}
                    >
                      {kpi.calls_agendadas}
                    </TableCell>
                    <TableCell
                      className="text-lg font-semibold cursor-pointer hover:text-emerald-600 hover:underline"
                      onClick={() => openDetail("tasa")}
                    >
                      {kpi.tasa_agenda}%
                    </TableCell>
                    <TableCell
                      className="text-lg font-semibold cursor-pointer hover:text-green-600 hover:underline"
                      onClick={() => openDetail("cash")}
                    >
                      ${kpi.cash_collected}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-16 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs — Últimos 7 días (Chart) */}
      <Card className="animate-blur-in stagger-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HiOutlineChartBarSquare className="h-5 w-5 text-primary" />
            KPIs — Últimos 7 días
          </CardTitle>
          {totals && (
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
              <span>Inbound: <strong className="text-foreground">{totals.inbound}</strong></span>
              <span>FUPs: <strong className="text-foreground">{totals.fups}</strong></span>
              <span>Cal. Env.: <strong className="text-foreground">{totals.cal}</strong></span>
              <span>Agendadas: <strong className="text-foreground">{totals.calls}</strong></span>
              <span>Tasa: <strong className="text-foreground">{totalTasa}%</strong></span>
              <span>Cash: <strong className="text-foreground">${totals.cash}</strong></span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {chartData ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="Inbound"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(data: unknown) => openDetail("inbound", (data as { fechaISO?: string }).fechaISO)}
                  />
                  <Bar
                    dataKey="FUPs"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(data: unknown) => openDetail("fups", (data as { fechaISO?: string }).fechaISO)}
                  />
                  <Bar
                    dataKey="Cal. Env."
                    fill="#0891b2"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(data: unknown) => openDetail("cal_enviados", (data as { fechaISO?: string }).fechaISO)}
                  />
                  <Bar
                    dataKey="Agendadas"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(data: unknown) => openDetail("calls_agendadas", (data as { fechaISO?: string }).fechaISO)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* FUPs del día */}
      <div className="animate-blur-in stagger-4">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HiOutlineClipboardDocumentCheck className="h-5 w-5 text-indigo-500" />
            FUPs del día
          </h2>
          {fupsTotal > 0 && (
            <Badge variant={fupsCompletados === fupsTotal ? "default" : "secondary"} className="text-xs" role="status">
              {fupsCompletados}/{fupsTotal}
            </Badge>
          )}
        </div>
        {fupsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : fups && fups.length > 0 ? (
          <div className="space-y-2">
            {fups.map((fup) => (
              <FupCard
                key={fup.id}
                fup={fup}
                onComplete={(id, completado) => {
                  completeFup.mutate({ id, completado }, {
                    onSuccess: () => toast.success(completado ? "FUP completado ✓" : "FUP marcado como pendiente"),
                    onError: (err) => toast.error(`Error: ${err.message}`),
                  });
                }}
                onDelete={(id) => {
                  deleteFup.mutate(id, {
                    onSuccess: () => toast.success("FUP eliminado"),
                    onError: (err) => toast.error(`Error: ${err.message}`),
                  });
                }}
                isPending={completeFup.isPending || deleteFup.isPending}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No hay FUPs programados para este día — programá FUPs desde la lista de leads
            </CardContent>
          </Card>
        )}

        {/* Calls del día sin pagar — subsección dentro de FUPs */}
        {!followUpsLoading && callsSinPagar.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-orange-700">
              <span>📞</span> Calls del día sin pagar reunión
            </h3>
            <div className="space-y-2">
              {callsSinPagar.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calls agendadas */}
      <div className="animate-blur-in stagger-5">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <HiOutlineBellAlert className="h-5 w-5 text-amber-500" />
          Calls agendadas
        </h2>
        {followUpsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : followUps && followUps.length > 0 ? (
          <div className="space-y-4">
            {callsSinPagar.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-orange-700">
                  <span>📞</span> Sin pagar reunión
                </h3>
                <div className="space-y-2 rounded-xl border-2 border-orange-200 bg-orange-50 p-2">
                  {callsSinPagar.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </div>
            )}
            {callsPagaron.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-green-700">
                  <span>✅</span> Pagaron reunión
                </h3>
                <div className="space-y-2 rounded-xl border-2 border-green-200 bg-green-50 p-2">
                  {callsPagaron.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No hay calls agendadas para este día
            </CardContent>
          </Card>
        )}
      </div>

      {/* Exportar KPIs */}
      <ExportKPIsButton profileName={currentUser?.full_name} />
    </div>
  );
}
