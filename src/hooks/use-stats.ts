import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDateStr, localDayBoundsISO } from "@/lib/utils";
import type { DailyKPI, KPIDetailType, Lead, AppSettings } from "@/types/database";

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

const SETTING_DEFAULTS: AppSettings = {
  cash_per_agenda: 32,
  commission_rate: 0.08,
  program_price: 697,
};

async function fetchSettings(): Promise<AppSettings> {
  const { data } = await getSupabase().from("settings").select("key, value");
  const result = { ...SETTING_DEFAULTS };
  for (const row of data ?? []) {
    if (row.key in result) {
      (result as Record<string, number>)[row.key] = Number(row.value);
    }
  }
  return result;
}

export const CASH_PER_AGENDA = 32; // kept for backward-compat reference only

function buildKPI(
  fecha: string,
  leadsCreated: number,
  fups: number,
  calEnviados: number,
  callsAgendadas: number,
  programCommission: number,
  settings: AppSettings
): DailyKPI {
  const inbound = leadsCreated;
  const tasa = inbound > 0 ? Math.round((callsAgendadas / inbound) * 100) : 0;
  const agendaCommission =
    callsAgendadas * settings.cash_per_agenda * settings.commission_rate;
  return {
    fecha,
    inbound_nuevo: inbound,
    fups,
    calendarios_enviados: calEnviados,
    calls_agendadas: callsAgendadas,
    tasa_agenda: tasa,
    cash_collected: Math.round((agendaCommission + programCommission) * 100) / 100,
  };
}

export function useStats(fecha: string) {
  return useQuery({
    queryKey: ["stats", fecha],
    queryFn: async () => {
      const { start: startOfDay, end: endOfDay } = localDayBoundsISO(fecha);

      const [
        settings,
        { count: inboundNuevo },
        { count: fupCount },
        { count: calEnviados },
        { count: callsAgendadas },
        { count: activos },
        { data: programPayments },
      ] = await Promise.all([
        fetchSettings(),
        getSupabase()
          .from("leads")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        getSupabase()
          .from("followups")
          .select("*", { count: "exact", head: true })
          .eq("fecha_programada", fecha),
        getSupabase()
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("tipo", "calendario_enviado")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        getSupabase()
          .from("leads")
          .select("*", { count: "exact", head: true })
          .not("fecha_call_set_at", "is", null)
          .gte("fecha_call_set_at", startOfDay)
          .lte("fecha_call_set_at", endOfDay),
        getSupabase()
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("estado", ["nuevo", "agendó"]),
        getSupabase()
          .from("leads")
          .select("monto_programa")
          .eq("pago_programa", true)
          .not("fecha_pago", "is", null)
          .gte("fecha_pago", startOfDay)
          .lte("fecha_pago", endOfDay),
      ]);

      const programCommission = (programPayments ?? []).reduce(
        (acc: number, l: { monto_programa: number | null }) =>
          acc + (l.monto_programa ?? 0) * settings.commission_rate,
        0
      );

      const kpi = buildKPI(
        fecha,
        inboundNuevo ?? 0,
        fupCount ?? 0,
        calEnviados ?? 0,
        callsAgendadas ?? 0,
        programCommission,
        settings
      );

      return { kpi, total_activos: activos ?? 0, settings };
    },
  });
}

export function useKPIHistory(days = 7) {
  return useQuery({
    queryKey: ["kpi-history", days],
    queryFn: async () => {
      const today = new Date();
      const dates: string[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(localDateStr(d));
      }

      const rangeStart = localDayBoundsISO(dates[0]).start;
      const rangeEnd = localDayBoundsISO(dates[dates.length - 1]).end;

      const [
        settings,
        { data: leads },
        { data: followupsData },
        { data: interactions },
        { data: agendaLeads },
        { data: programLeads },
      ] = await Promise.all([
        fetchSettings(),
        getSupabase()
          .from("leads")
          .select("id, created_at")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
        getSupabase()
          .from("followups")
          .select("fecha_programada")
          .gte("fecha_programada", dates[0])
          .lte("fecha_programada", dates[dates.length - 1]),
        getSupabase()
          .from("interactions")
          .select("tipo, created_at")
          .eq("tipo", "calendario_enviado")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
        getSupabase()
          .from("leads")
          .select("id, fecha_call_set_at")
          .not("fecha_call_set_at", "is", null)
          .gte("fecha_call_set_at", rangeStart)
          .lte("fecha_call_set_at", rangeEnd),
        getSupabase()
          .from("leads")
          .select("monto_programa, fecha_pago")
          .eq("pago_programa", true)
          .not("fecha_pago", "is", null)
          .gte("fecha_pago", rangeStart)
          .lte("fecha_pago", rangeEnd),
      ]);

      return dates.map((fecha) => {
        const { start: dayStart, end: dayEnd } = localDayBoundsISO(fecha);

        const inbound = (leads ?? []).filter(
          (l: { created_at: string }) =>
            l.created_at >= dayStart && l.created_at <= dayEnd
        ).length;

        const fups = (followupsData ?? []).filter(
          (f: { fecha_programada: string }) => f.fecha_programada === fecha
        ).length;

        const calEnviados = (interactions ?? []).filter(
          (i: { created_at: string }) =>
            i.created_at >= dayStart && i.created_at <= dayEnd
        ).length;

        const callsAgendadas = (agendaLeads ?? []).filter(
          (l: { fecha_call_set_at: string | null }) =>
            l.fecha_call_set_at! >= dayStart && l.fecha_call_set_at! <= dayEnd
        ).length;

        const programCommission = (programLeads ?? []).reduce(
          (acc: number, l: { monto_programa: number | null; fecha_pago: string | null }) => {
            if (!l.fecha_pago) return acc;
            return l.fecha_pago >= dayStart && l.fecha_pago <= dayEnd
              ? acc + (l.monto_programa ?? 0) * settings.commission_rate
              : acc;
          },
          0
        );

        return buildKPI(fecha, inbound, fups, calEnviados, callsAgendadas, programCommission, settings);
      });
    },
  });
}

// ─── KPI Detail — returns the actual records behind each KPI card ───────────

export interface KPIDetailItem {
  id: string;
  nombre: string;
  estado?: string;
  subtitle?: string;
  amount?: number;
}

export interface KPIDetailResult {
  items: KPIDetailItem[];
  meta?: string;
}

export function useKPIDetail(fecha: string, tipo: KPIDetailType | null) {
  return useQuery({
    queryKey: ["kpi-detail", fecha, tipo],
    enabled: !!tipo,
    queryFn: async () => {
      const { start: startOfDay, end: endOfDay } = localDayBoundsISO(fecha);

      if (tipo === "inbound") {
        const { data, error } = await getSupabase()
          .from("leads")
          .select("id, nombre, estado, created_at")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return {
          items: (data ?? []).map(
            (l: Pick<Lead, "id" | "nombre" | "estado" | "created_at">) => ({
              id: l.id,
              nombre: l.nombre,
              estado: l.estado,
              subtitle: new Date(l.created_at).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })
          ),
        } as KPIDetailResult;
      }

      if (tipo === "fups") {
        const { data, error } = await getSupabase()
          .from("followups")
          .select("id, completado, hora_programada, lead:leads(id, nombre, estado)")
          .eq("fecha_programada", fecha)
          .order("completado", { ascending: true })
          .order("created_at", { ascending: true });
        if (error) throw error;
        return {
          items: (data as unknown as {
            id: string;
            completado: boolean;
            hora_programada: string | null;
            lead: { id: string; nombre: string; estado: string } | null;
          }[]).map(
            (f) => ({
              id: f.lead?.id ?? f.id,
              nombre: f.lead?.nombre ?? "—",
              estado: f.lead?.estado,
              subtitle: f.completado
                ? "✓ Completado"
                : f.hora_programada
                ? `Hora: ${f.hora_programada}`
                : "Pendiente",
            })
          ),
        } as KPIDetailResult;
      }

      if (tipo === "cal_enviados") {
        const { data, error } = await getSupabase()
          .from("interactions")
          .select("id, created_at, lead:leads(id, nombre, estado)")
          .eq("tipo", "calendario_enviado")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return {
          items: (data as unknown as {
            id: string;
            created_at: string;
            lead: { id: string; nombre: string; estado: string } | null;
          }[]).map(
            (i) => ({
              id: i.lead?.id ?? i.id,
              nombre: i.lead?.nombre ?? "—",
              estado: i.lead?.estado,
              subtitle: new Date(i.created_at).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })
          ),
        } as KPIDetailResult;
      }

      if (tipo === "calls_agendadas") {
        const { data, error } = await getSupabase()
          .from("leads")
          .select("id, nombre, estado, fecha_call, fecha_call_set_at")
          .not("fecha_call_set_at", "is", null)
          .gte("fecha_call_set_at", startOfDay)
          .lte("fecha_call_set_at", endOfDay)
          .order("fecha_call_set_at", { ascending: false });
        if (error) throw error;
        return {
          items: (data ?? []).map(
            (l: Pick<Lead, "id" | "nombre" | "estado" | "fecha_call" | "fecha_call_set_at">) => ({
              id: l.id,
              nombre: l.nombre,
              estado: l.estado,
              subtitle: l.fecha_call
                ? `Call: ${new Date(l.fecha_call).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                  })} ${new Date(l.fecha_call).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Sin fecha de call",
            })
          ),
        } as KPIDetailResult;
      }

      if (tipo === "tasa") {
        const [{ count: callsAgendadas }, { count: inbound }] = await Promise.all([
          getSupabase()
            .from("leads")
            .select("*", { count: "exact", head: true })
            .not("fecha_call_set_at", "is", null)
            .gte("fecha_call_set_at", startOfDay)
            .lte("fecha_call_set_at", endOfDay),
          getSupabase()
            .from("leads")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfDay)
            .lte("created_at", endOfDay),
        ]);
        const tasa =
          (inbound ?? 0) > 0
            ? Math.round(((callsAgendadas ?? 0) / (inbound ?? 1)) * 100)
            : 0;
        return {
          items: [],
          meta: `${callsAgendadas ?? 0} calls agendadas / ${inbound ?? 0} inbound = ${tasa}%`,
        } as KPIDetailResult;
      }

      if (tipo === "cash") {
        const [settings, agendaResult, programResult] = await Promise.all([
          fetchSettings(),
          getSupabase()
            .from("leads")
            .select("id, nombre, estado, fecha_call_set_at")
            .not("fecha_call_set_at", "is", null)
            .gte("fecha_call_set_at", startOfDay)
            .lte("fecha_call_set_at", endOfDay)
            .order("fecha_call_set_at", { ascending: false }),
          getSupabase()
            .from("leads")
            .select("id, nombre, estado, monto_programa, plan_pago, fecha_pago")
            .eq("pago_programa", true)
            .not("fecha_pago", "is", null)
            .gte("fecha_pago", startOfDay)
            .lte("fecha_pago", endOfDay),
        ]);

        const agendaItems = (
          (agendaResult.data ?? []) as Pick<Lead, "id" | "nombre" | "estado">[]
        ).map((l) => ({
          id: l.id,
          nombre: l.nombre,
          estado: l.estado,
          subtitle: `Agenda inicial — comisión $${(
            settings.cash_per_agenda * settings.commission_rate
          ).toFixed(2)}`,
          amount: settings.cash_per_agenda * settings.commission_rate,
        }));

        const programItems = (
          (programResult.data ?? []) as Pick<
            Lead,
            "id" | "nombre" | "estado" | "monto_programa" | "plan_pago"
          >[]
        ).map((l) => ({
          id: l.id,
          nombre: l.nombre,
          estado: l.estado,
          subtitle: `Programa (${
            l.plan_pago === "completo"
              ? "pago completo"
              : l.plan_pago === "2_partes"
              ? "2 partes"
              : l.plan_pago === "3_partes"
              ? "3 partes"
              : "—"
          }) — comisión $${((l.monto_programa ?? 0) * settings.commission_rate).toFixed(2)}`,
          amount: (l.monto_programa ?? 0) * settings.commission_rate,
        }));

        const allItems = [...agendaItems, ...programItems];
        const total = allItems.reduce((acc, i) => acc + (i.amount ?? 0), 0);

        return {
          items: allItems,
          meta: `Total comisión del día: $${total.toFixed(2)} (tasa ${Math.round(
            settings.commission_rate * 100
          )}%)`,
        } as KPIDetailResult;
      }

      return { items: [] } as KPIDetailResult;
    },
  });
}
