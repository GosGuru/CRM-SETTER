import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { localDateStr, localDayBoundsISO } from "@/lib/utils";
import type { Lead, LeadEstado } from "@/types/database";

// --- Infinite leads (server-side filtering + pagination) ---

export const LEADS_PAGE_SIZE = 50;

export type SortOption = "recientes" | "antiguos" | "az" | "za" | "calificados";

export type InfiniteLeadsFilters = {
  filtroEstado?: LeadEstado | "todos";
  search?: string;
  dateFilter?: string;
  sortBy?: SortOption;
};

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const LEAD_LIST_SELECT =
  "id, nombre, nombre_real, apellido, celular, email, instagram, estado, closer_id, setter_id, fecha_call, fecha_call_set_at, pinned, created_at, updated_at, pago_programa, plan_pago, monto_programa, fecha_pago, respuestas, objetivo, edad, trabajo, decisor, inversion_ok, compromiso, closer:users!leads_closer_id_fkey(id,full_name), setter:users!leads_setter_id_fkey(id,full_name)";

// Solo normaliza espacios — NO reemplaza _ . - porque son parte de handles de Instagram
function normalizeSearchInput(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStoredName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

// Solo divide por espacios — los guiones bajos NO son separadores
function tokenizeSearch(value: string): string[] {
  return normalizeSearchInput(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function canonicalText(value: string): string {
  return normalizeSearchInput(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "");
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function buildLeadSearchIndex(lead: Lead): string {
  const values = [
    lead.nombre,
    lead.nombre_real,
    lead.apellido,
    [lead.nombre_real, lead.apellido].filter(Boolean).join(" "),
    lead.celular,
    lead.email,
    lead.instagram,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const index = new Set<string>();

  for (const value of values) {
    const normalized = canonicalText(value);
    if (normalized) {
      index.add(normalized);
      index.add(normalized.replace(/^@+/, ""));
    }

    const digits = digitsOnly(value);
    if (digits) index.add(digits);
  }

  return [...index].filter(Boolean).join(" ");
}

function buildSearchTokenGroups(term: string): string[][] {
  const normalized = canonicalText(term);
  if (!normalized) return [];

  return tokenizeSearch(normalized)
    .map((token) => {
      const variants = new Set<string>();
      variants.add(token);
      variants.add(token.replace(/^@+/, ""));

      const digits = digitsOnly(token);
      if (digits) variants.add(digits);

      return [...variants].filter(Boolean);
    })
    .filter((group) => group.length > 0);
}

export function useInfiniteLeads(filters: InfiniteLeadsFilters) {
  return useInfiniteQuery({
    queryKey: ["leads-infinite", filters],
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * LEADS_PAGE_SIZE;
      const to = from + LEADS_PAGE_SIZE - 1;

      let query = getSupabase()
        .from("leads")
        .select(LEAD_LIST_SELECT)
        .range(from, to);

      // Estado filter
      if (filters.filtroEstado && filters.filtroEstado !== "todos") {
        query = query.eq("estado", filters.filtroEstado);
      }

      // NOTE: search is handled client-side via useLeadsSearchIndex — not here.

      // Date filter — bounds use localDayBoundsISO so Supabase timestamptz
      // comparisons respect the user's local timezone (not UTC midnight).
      const now = new Date();
      if (filters.dateFilter && filters.dateFilter !== "todos") {
        if (filters.dateFilter === "hoy") {
          const { start, end } = localDayBoundsISO(localDateStr(now));
          query = query.gte("created_at", start).lte("created_at", end);
        } else if (filters.dateFilter === "ayer") {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const { start, end } = localDayBoundsISO(localDateStr(yesterday));
          query = query.gte("created_at", start).lte("created_at", end);
        } else if (filters.dateFilter === "semana") {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          const { start } = localDayBoundsISO(localDateStr(weekAgo));
          query = query.gte("created_at", start);
        } else {
          // custom YYYY-MM-DD
          const { start, end } = localDayBoundsISO(filters.dateFilter);
          query = query.gte("created_at", start).lte("created_at", end);
        }
      }

      // Sort — calificados is client-side, rest are server-side
      const sortBy = filters.sortBy ?? "recientes";
      if (sortBy === "az") {
        query = query.order("nombre", { ascending: true });
      } else if (sortBy === "za") {
        query = query.order("nombre", { ascending: false });
      } else if (sortBy === "antiguos") {
        query = query
          .order("pinned", { ascending: true })
          .order("created_at", { ascending: true });
      } else {
        // recientes + calificados both fetch newest first
        query = query
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Lead[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === LEADS_PAGE_SIZE ? (lastPageParam as number) + 1 : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });
}

// --- Client-side search index ---
// Loads all visible leads in batches so search can cover the full dataset
// instead of a capped snapshot of the newest rows only.
export const SEARCH_INDEX_BATCH_SIZE = 500;

export function useLeadsSearchIndex(enabled: boolean) {
  return useQuery({
    queryKey: ["leads-search-index"],
    queryFn: async () => {
      const allLeads: Lead[] = [];

      for (let page = 0; ; page++) {
        const from = page * SEARCH_INDEX_BATCH_SIZE;
        const to = from + SEARCH_INDEX_BATCH_SIZE - 1;

        const { data, error } = await getSupabase()
          .from("leads")
          .select(LEAD_LIST_SELECT)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        const batch = (data ?? []) as unknown as Lead[];
        allLeads.push(...batch);

        if (batch.length < SEARCH_INDEX_BATCH_SIZE) break;
      }

      return allLeads;
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function searchLeads(leads: Lead[], term: string): Lead[] {
  const normalized = canonicalText(term);
  if (!normalized) return leads;

  const fullQueryVariants = new Set<string>([
    normalized,
    normalized.replace(/^@+/, ""),
  ]);
  const digitsQuery = digitsOnly(term);
  if (digitsQuery) fullQueryVariants.add(digitsQuery);

  const tokenGroups = buildSearchTokenGroups(term);

  return leads.filter((lead) => {
    const searchIndex = buildLeadSearchIndex(lead);
    if (!searchIndex) return false;

    if ([...fullQueryVariants].some((variant) => variant && searchIndex.includes(variant))) {
      return true;
    }

    return tokenGroups.length > 0 &&
      tokenGroups.every((group) => group.some((variant) => variant && searchIndex.includes(variant)));
  });
}

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

// --- Queries ---

export function useLeads(filtroEstado?: LeadEstado | "todos") {
  return useQuery({
    queryKey: ["leads", filtroEstado],
    queryFn: async () => {
      let query = getSupabase()
        .from("leads")
        .select("*, closer:users!leads_closer_id_fkey(*), setter:users!leads_setter_id_fkey(*)")
        .order("created_at", { ascending: false });

      if (filtroEstado && filtroEstado !== "todos") {
        query = query.eq("estado", filtroEstado);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("leads")
        .select("*, closer:users!leads_closer_id_fkey(*), setter:users!leads_setter_id_fkey(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!id,
  });
}

export function useFollowUps(fecha: string) {
  return useQuery({
    queryKey: ["followups", fecha],
    queryFn: async () => {
      const startOfDay = `${fecha}T00:00:00`;
      const endOfDay = `${fecha}T23:59:59`;

      const { data, error } = await getSupabase()
        .from("leads")
        .select("*, closer:users!leads_closer_id_fkey(*)")
        .eq("estado", "seguimiento")
        .gte("fecha_call", startOfDay)
        .lte("fecha_call", endOfDay)
        .order("fecha_call", { ascending: true });

      if (error) throw error;
      return data as Lead[];
    },
  });
}

// --- Mutations ---

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: { nombre: string; setter_id: string; created_at?: string }) => {
      // Duplicate check aligned with search normalization and accent-insensitive comparison.
      const normalized = normalizeStoredName(lead.nombre);
      const canonical = canonicalText(normalized);
      const probeToken = tokenizeSearch(normalized)[0] ?? normalizeSearchInput(normalized);
      const probe = `%${escapeLikePattern(probeToken)}%`;

      const { data: candidates, error: duplicateError } = await getSupabase()
        .from("leads")
        .select("id, nombre")
        .ilike("nombre", probe)
        .limit(50);
      if (duplicateError) throw duplicateError;

      const existing = (candidates ?? []).find((row) => canonicalText(row.nombre) === canonical);
      if (existing) {
        throw new Error(`Ya existe un lead con el nombre "${existing.nombre}"`);
      }

      const row: Record<string, unknown> = {
        nombre: normalized,
        setter_id: lead.setter_id,
        estado: "nuevo",
      };
      if (lead.created_at) row.created_at = lead.created_at;
      const { data, error } = await getSupabase()
        .from("leads")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["leads-search-index"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useBulkCreateLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leads: { nombre: string; setter_id: string; created_at?: string }[]) => {
      // 1. Dedupe within the batch (case-insensitive)
      const seen = new Set<string>();
      const unique = leads.filter((l) => {
        const key = canonicalText(l.nombre);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 2. Fetch candidate existing names and compare canonically in-memory.
      const probes = Array.from(
        new Set(
          unique
            .map((l) => tokenizeSearch(l.nombre)[0] ?? normalizeSearchInput(l.nombre))
            .filter(Boolean)
        )
      ).slice(0, 40);

      let existing: { nombre: string }[] = [];
      if (probes.length > 0) {
        const orFilter = probes
          .map((p) => `nombre.ilike.%${escapeLikePattern(p)}%`)
          .join(",");

        const { data, error } = await getSupabase()
          .from("leads")
          .select("nombre")
          .or(orFilter);
        if (error) throw error;
        existing = (data ?? []) as { nombre: string }[];
      }

      const existingLower = new Set(
        existing.map((l) => canonicalText(l.nombre))
      );

      const duplicates = unique.filter((l) => existingLower.has(canonicalText(l.nombre)));
      const toInsert = unique.filter((l) => !existingLower.has(canonicalText(l.nombre)));

      if (toInsert.length === 0) {
        throw new Error(
          duplicates.length === 1
            ? `El lead "${duplicates[0].nombre}" ya existe`
            : `Los ${duplicates.length} leads ya existen en el sistema`
        );
      }

      const rows = toInsert.map((l) => {
        const row: Record<string, unknown> = {
          nombre: normalizeStoredName(l.nombre),
          setter_id: l.setter_id,
          estado: "nuevo",
        };
        if (l.created_at) row.created_at = l.created_at;
        return row;
      });
      const { data, error } = await getSupabase()
        .from("leads")
        .insert(rows)
        .select();
      if (error) throw error;
      return { created: data as Lead[], duplicates: duplicates.map((d) => d.nombre) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["leads-search-index"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Lead> & { id: string }) => {
      const { data, error } = await getSupabase()
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["leads-search-index"] });
      queryClient.invalidateQueries({ queryKey: ["lead", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}

export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      updates,
    }: {
      ids: string[];
      updates: Partial<Pick<Lead, "estado" | "closer_id" | "created_at" | "fecha_call" | "fecha_call_set_at">>;
    }) => {
      const { data, error } = await getSupabase()
        .from("leads")
        .update(updates)
        .in("id", ids)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["leads-search-index"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}

export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await getSupabase()
        .from("leads")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["leads-search-index"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { data, error } = await getSupabase()
        .from("leads")
        .update({ pinned })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["leads-search-index"] });
      queryClient.invalidateQueries({ queryKey: ["lead", variables.id] });
    },
  });
}

export function useUpdateLeadPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      pago_programa,
      plan_pago,
      monto_programa,
      fecha_pago,
    }: {
      id: string;
      pago_programa: boolean;
      plan_pago: import("@/types/database").PlanPago | null;
      monto_programa: number | null;
      fecha_pago: string | null;
    }) => {
      const { data, error } = await getSupabase()
        .from("leads")
        .update({ pago_programa, plan_pago, monto_programa, fecha_pago })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads-search-index"] });
      queryClient.invalidateQueries({ queryKey: ["lead", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-history"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-detail"] });
    },
  });
}
