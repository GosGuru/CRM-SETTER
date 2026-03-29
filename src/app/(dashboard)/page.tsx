"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadCard } from "@/components/lead-card";
import { FupCard } from "@/components/fup-card";
import { Input } from "@/components/ui/input";
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
import { useFollowUps } from "@/hooks/use-leads";
import { useFollowups, useCompleteFollowup, useDeleteFollowup } from "@/hooks/use-followups";
import { useStats, useKPIHistory, CASH_PER_AGENDA } from "@/hooks/use-stats";
import { useCurrentUser } from "@/hooks/use-users";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
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
  HiOutlineSparkles,
  HiOutlineClipboardDocumentCheck,
} from "react-icons/hi2";

function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  delay,
}: {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}) {
  return (
    <Card className={`animate-blur-in-scale${delay ? ` stagger-${delay}` : ""} transition-shadow hover:shadow-md`}>
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
  return d.toISOString().slice(0, 10);
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

  const fupsCompletados = fups?.filter((f) => f.completado).length ?? 0;
  const fupsTotal = fups?.length ?? 0;

  const hoy = new Date().toISOString().slice(0, 10);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-blur-fade">
        <div>
          <div className="flex items-center gap-3">
            <HiOutlineSparkles className="h-6 w-6 text-primary" />
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
          <Input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-auto h-9"
          />
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
          />
          <StatCard
            title="FUPS"
            value={kpi?.fups ?? 0}
            icon={HiOutlinePhoneArrowUpRight}
            color="bg-indigo-600"
            delay={2}
          />
          <StatCard
            title="Cal. Enviados"
            value={kpi?.calendarios_enviados ?? 0}
            icon={HiOutlinePaperAirplane}
            color="bg-cyan-600"
            delay={3}
          />
          <StatCard
            title="Calls Agendadas"
            value={kpi?.calls_agendadas ?? 0}
            icon={HiOutlineCalendarDays}
            color="bg-amber-600"
            delay={4}
          />
          <StatCard
            title="Tasa de Agenda"
            value={kpi?.tasa_agenda ?? 0}
            suffix="%"
            icon={HiOutlineChartBarSquare}
            color="bg-emerald-600"
            delay={5}
          />
          <StatCard
            title="Cash Collected"
            value={`$${kpi?.cash_collected ?? 0}`}
            icon={HiOutlineBanknotes}
            color="bg-green-600"
            delay={6}
          />
        </div>
      )}

      {/* Tabla KPI últimos 7 días */}
      <Card className="animate-blur-in stagger-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <HiOutlineChartBarSquare className="h-5 w-5 text-primary" />
            KPIs — Últimos 7 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpiHistory ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Inbound</TableHead>
                    <TableHead className="text-right">FUPS</TableHead>
                    <TableHead className="text-right">Cal. Env.</TableHead>
                    <TableHead className="text-right">Agendadas</TableHead>
                    <TableHead className="text-right">Tasa %</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiHistory.map((row) => (
                    <TableRow key={row.fecha}>
                      <TableCell className="font-medium">{formatFecha(row.fecha)}</TableCell>
                      <TableCell className="text-right">{row.inbound_nuevo}</TableCell>
                      <TableCell className="text-right">{row.fups}</TableCell>
                      <TableCell className="text-right">{row.calendarios_enviados}</TableCell>
                      <TableCell className="text-right">{row.calls_agendadas}</TableCell>
                      <TableCell className="text-right">{row.tasa_agenda}%</TableCell>
                      <TableCell className="text-right">${row.cash_collected}</TableCell>
                    </TableRow>
                  ))}
                  {totals && (
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totals.inbound}</TableCell>
                      <TableCell className="text-right">{totals.fups}</TableCell>
                      <TableCell className="text-right">{totals.cal}</TableCell>
                      <TableCell className="text-right">{totals.calls}</TableCell>
                      <TableCell className="text-right">{totalTasa}%</TableCell>
                      <TableCell className="text-right">${totals.cash}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
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
          <div className="space-y-2">
            {followUps.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No hay calls agendadas para este día
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
