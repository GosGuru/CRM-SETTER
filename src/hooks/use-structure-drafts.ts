import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const SETTINGS_KEY = "structure_drafts";
const QUERY_KEY = ["structure-drafts"];

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

      if (error) throw error;
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
      const { error } = await getSupabase()
        .from("settings")
        .upsert(
          { key: SETTINGS_KEY, value: JSON.stringify(drafts), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, drafts) => {
      queryClient.setQueryData(QUERY_KEY, drafts);
    },
  });
}
