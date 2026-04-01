import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/types/database";

const DEFAULTS: AppSettings = {
  cash_per_agenda: 32,
  commission_rate: 0.08,
  program_price: 697,
};

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("settings")
        .select("key, value");
      if (error) throw error;
      const result = { ...DEFAULTS };
      for (const row of data ?? []) {
        if (row.key in result) {
          (result as Record<string, number>)[row.key] = Number(row.value);
        }
      }
      return result as AppSettings;
    },
    staleTime: 30_000,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await getSupabase()
        .from("settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-history"] });
    },
  });
}
