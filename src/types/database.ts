export type UserRole = "setter" | "closer";

export type LeadEstado = "nuevo" | "seguimiento" | "cerrado" | "pagó";

export type InteractionTipo =
  | "nota"
  | "llamada"
  | "whatsapp"
  | "cambio_estado"
  | "calendario_enviado";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  nombre: string;
  edad: number | null;
  trabajo: string | null;
  email: string | null;
  celular: string | null;
  instagram: string | null;
  respuestas: string | null;
  objetivo: string | null;
  decisor: string | null;
  inversion_ok: string | null;
  compromiso: string | null;
  estado: LeadEstado;
  closer_id: string | null;
  setter_id: string;
  fecha_call: string | null;
  fecha_call_set_at: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  closer?: User | null;
  setter?: User | null;
}

export interface Interaction {
  id: string;
  lead_id: string;
  user_id: string;
  tipo: InteractionTipo;
  contenido: string;
  created_at: string;
  // Join opcional
  user?: User | null;
}

export interface Followup {
  id: string;
  lead_id: string;
  user_id: string;
  fecha_programada: string;
  completado: boolean;
  completado_at: string | null;
  created_at: string;
  // Join opcional
  lead?: Lead | null;
}

// KPIs del dashboard
export interface DailyKPI {
  fecha: string;
  inbound_nuevo: number;
  fups: number;
  calendarios_enviados: number;
  calls_agendadas: number;
  tasa_agenda: number;
  cash_collected: number;
}
