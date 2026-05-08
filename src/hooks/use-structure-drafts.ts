import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const SETTINGS_KEY = "structure_drafts";
const QUERY_KEY = ["structure-drafts"];
const SETTINGS_TABLE_MISSING_CODE = "PGRST205";

export class StructureDraftsSchemaMissingError extends Error {
  constructor() {
    super("No existe la tabla public.settings en Supabase.");
    this.name = "StructureDraftsSchemaMissingError";
  }
}

export function isStructureDraftsSchemaMissingError(
  error: unknown
): error is StructureDraftsSchemaMissingError {
  return error instanceof StructureDraftsSchemaMissingError;
}

function sanitizeDrafts(drafts: Record<string, string>) {
  const entries = Object.entries(drafts).map(([key, value]) => [
    key,
    // Postgres text cannot store null bytes, which can appear in pasted content.
    value.replace(/\u0000/g, ""),
  ]);
  return Object.fromEntries(entries) as Record<string, string>;
}

function normalizeStructureDraftsError(error: unknown): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === SETTINGS_TABLE_MISSING_CODE
  ) {
    return new StructureDraftsSchemaMissingError();
  }

  if (error instanceof Error) return error;
  return new Error("Error desconocido al guardar la estructura.");
}

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export function useStructureDrafts() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();

      if (error) throw normalizeStructureDraftsError(error);
      if (!data?.value) return null;

      try {
        return JSON.parse(data.value) as Record<string, string>;
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
  });
}

export function useSaveStructureDrafts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (drafts: Record<string, string>) => {
      const supabase = getSupabase();
      const sanitizedDrafts = sanitizeDrafts(drafts);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
      }

      const { error } = await supabase
        .from("settings")
        .upsert(
          { key: SETTINGS_KEY, value: JSON.stringify(sanitizedDrafts), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      if (error) throw normalizeStructureDraftsError(error);

      return sanitizedDrafts;
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    onSuccess: (sanitizedDrafts) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.setQueryData(QUERY_KEY, sanitizedDrafts);
    },
  });
}
