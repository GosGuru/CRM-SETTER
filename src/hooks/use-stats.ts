import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DailyKPI } from "@/types/database";

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export const CASH_PER_AGENDA = 32;

function buildKPI(
  fecha: string,
  leadsCreated: number,
  fups: number,
  calEnviados: number,
  callsAgendadas: number
): DailyKPI {
  const inbound = leadsCreated;
  const tasa = inbound > 0 ? Math.round((callsAgendadas / inbound) * 100) : 0;
  return {
    fecha,
    inbound_nuevo: inbound,
    fups,
    calendarios_enviados: calEnviados,
    calls_agendadas: callsAgendadas,
    tasa_agenda: tasa,
    cash_collected: callsAgendadas * CASH_PER_AGENDA,
  };
}

export function useStats(fecha: string) {
  return useQuery({
    queryKey: ["stats", fecha],
    queryFn: async () => {
      const startOfDay = `${fecha}T00:00:00`;
      const endOfDay = `${fecha}T23:59:59`;

      const [
        { count: inboundNuevo },
        { count: fupCount },
        { count: calEnviados },
        { count: callsAgendadas },
        { count: activos },
      ] = await Promise.all([
        // Inbound nuevo: leads creados ese día
        getSupabase()
          .from("leads")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        // FUPs programados para ese día
        getSupabase()
          .from("followups")
          .select("*", { count: "exact", head: true })
          .eq("fecha_programada", fecha),
        // Calendarios enviados
        getSupabase()
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("tipo", "calendario_enviado")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
        // Calls agendadas (bookeadas ese día)
        getSupabase()
          .from("leads")
          .select("*", { count: "exact", head: true })
          .not("fecha_call_set_at", "is", null)
          .gte("fecha_call_set_at", startOfDay)
          .lte("fecha_call_set_at", endOfDay),
        // Total leads activos
        getSupabase()
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("estado", ["nuevo", "seguimiento"]),
      ]);

      const kpi = buildKPI(
        fecha,
        inboundNuevo ?? 0,
        fupCount ?? 0,
        calEnviados ?? 0,
        callsAgendadas ?? 0
      );

      return { kpi, total_activos: activos ?? 0 };
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
        dates.push(d.toISOString().slice(0, 10));
      }

      const rangeStart = `${dates[0]}T00:00:00`;
      const rangeEnd = `${dates[dates.length - 1]}T23:59:59`;

      const [
        { data: leads },
        { data: followupsData },
        { data: interactions },
        { data: agendaLeads },
      ] = await Promise.all([
        // Leads in range
        getSupabase()
          .from("leads")
          .select("id, created_at, fecha_call")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
        // Followups in range
        getSupabase()
          .from("followups")
          .select("fecha_programada")
          .gte("fecha_programada", dates[0])
          .lte("fecha_programada", dates[dates.length - 1]),
        // Interactions in range (for calendarios)
        getSupabase()
          .from("interactions")
          .select("tipo, created_at")
          .eq("tipo", "calendario_enviado")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
        // Calls agendadas (bookeadas en el rango)
        getSupabase()
          .from("leads")
          .select("id, fecha_call_set_at")
          .not("fecha_call_set_at", "is", null)
          .gte("fecha_call_set_at", rangeStart)
          .lte("fecha_call_set_at", rangeEnd),
      ]);

      return dates.map((fecha) => {
        const dayStart = `${fecha}T00:00:00`;
        const dayEnd = `${fecha}T23:59:59`;

        const inbound = (leads ?? []).filter(
          (l: { created_at: string }) => l.created_at >= dayStart && l.created_at <= dayEnd
        ).length;

        const fups = (followupsData ?? []).filter(
          (f: { fecha_programada: string }) => f.fecha_programada === fecha
        ).length;

        const calEnviados = (interactions ?? []).filter(
          (i: { created_at: string }) =>
            i.created_at >= dayStart &&
            i.created_at <= dayEnd
        ).length;

        const callsAgendadas = (agendaLeads ?? []).filter(
          (l: { fecha_call_set_at: string | null }) => l.fecha_call_set_at! >= dayStart && l.fecha_call_set_at! <= dayEnd
        ).length;

        return buildKPI(fecha, inbound, fups, calEnviados, callsAgendadas);
      });
    },
  });
}
