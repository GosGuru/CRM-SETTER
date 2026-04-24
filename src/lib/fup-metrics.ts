export const FUP_REALIZADO_TIPO = "fup_realizado" as const;

const LEGACY_FUP_TEXT = /\bfup\b/i;

export type FupDoneSource = "manual" | "programado";

type LeadSummary = {
  id?: string | null;
  nombre?: string | null;
  estado?: string | null;
};

export type FupDoneInteractionRow = {
  id: string;
  lead_id: string | null;
  tipo: string;
  contenido: string;
  created_at: string;
  lead?: LeadSummary | null;
};

export type FupDoneFollowupRow = {
  id: string;
  lead_id: string | null;
  completado_at: string | null;
  lead?: LeadSummary | null;
};

export type FupDoneRecord = {
  key: string;
  leadId: string | null;
  leadName: string;
  estado?: string;
  timestamp: string;
  sources: FupDoneSource[];
  note?: string;
};

export function isFupDoneInteraction(interaction: Pick<FupDoneInteractionRow, "tipo" | "contenido">) {
  return (
    interaction.tipo === FUP_REALIZADO_TIPO ||
    (interaction.tipo === "whatsapp" && LEGACY_FUP_TEXT.test(interaction.contenido))
  );
}

function sourceLabel(source: FupDoneSource) {
  return source === "manual" ? "Manual" : "Programado";
}

export function getFupDoneSourceLabel(sources: FupDoneSource[]) {
  return sources.map(sourceLabel).join(" + ");
}

function upsertRecord(
  records: Map<string, FupDoneRecord>,
  event: Omit<FupDoneRecord, "sources"> & { source: FupDoneSource }
) {
  const current = records.get(event.key);
  if (!current) {
    records.set(event.key, {
      key: event.key,
      leadId: event.leadId,
      leadName: event.leadName,
      estado: event.estado,
      timestamp: event.timestamp,
      sources: [event.source],
      note: event.note,
    });
    return;
  }

  if (!current.sources.includes(event.source)) {
    current.sources.push(event.source);
  }

  if (event.timestamp > current.timestamp) {
    current.timestamp = event.timestamp;
    current.note = event.note ?? current.note;
  }

  if (current.leadName === "-" && event.leadName !== "-") {
    current.leadName = event.leadName;
  }

  current.estado = current.estado ?? event.estado;
}

export function buildUniqueFupDoneRecords(
  completedFollowups: FupDoneFollowupRow[],
  interactions: FupDoneInteractionRow[]
) {
  const records = new Map<string, FupDoneRecord>();

  for (const followup of completedFollowups) {
    if (!followup.completado_at) continue;
    const leadId = followup.lead_id ?? followup.lead?.id ?? null;
    upsertRecord(records, {
      key: leadId ?? `followup:${followup.id}`,
      leadId,
      leadName: followup.lead?.nombre ?? "-",
      estado: followup.lead?.estado ?? undefined,
      timestamp: followup.completado_at,
      source: "programado",
      note: "FUP programado completado",
    });
  }

  for (const interaction of interactions) {
    if (!isFupDoneInteraction(interaction)) continue;
    const leadId = interaction.lead_id ?? interaction.lead?.id ?? null;
    upsertRecord(records, {
      key: leadId ?? `interaction:${interaction.id}`,
      leadId,
      leadName: interaction.lead?.nombre ?? "-",
      estado: interaction.lead?.estado ?? undefined,
      timestamp: interaction.created_at,
      source: "manual",
      note: interaction.contenido,
    });
  }

  return [...records.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}