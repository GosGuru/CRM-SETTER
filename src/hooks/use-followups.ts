import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Followup } from "@/types/database";

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export function useFollowups(fecha: string) {
  return useQuery({
    queryKey: ["fups", fecha],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("followups")
        .select("*, lead:leads(*, closer:users!leads_closer_id_fkey(*))")
        .eq("fecha_programada", fecha)
        .order("completado", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Followup[];
    },
  });
}

export function useLeadFollowups(leadId: string) {
  return useQuery({
    queryKey: ["fups", "lead", leadId],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("followups")
        .select("*")
        .eq("lead_id", leadId)
        .eq("completado", false)
        .order("fecha_programada", { ascending: true });
      if (error) throw error;
      return data as Followup[];
    },
    enabled: !!leadId,
  });
}

export function useCreateFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fup: { lead_id: string; user_id: string; fecha_programada: string; hora_programada?: string }) => {
      const { data, error } = await getSupabase()
        .from("followups")
        .insert(fup)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fups"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useBulkCreateFollowups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fups: { lead_id: string; user_id: string; fecha_programada: string }[]) => {
      const { data, error } = await getSupabase()
        .from("followups")
        .insert(fups)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fups"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useCompleteFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completado }: { id: string; completado: boolean }) => {
      const { data, error } = await getSupabase()
        .from("followups")
        .update({
          completado,
          completado_at: completado ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, completado }) => {
      await queryClient.cancelQueries({ queryKey: ["fups"] });
      const queries = queryClient.getQueriesData<Followup[]>({ queryKey: ["fups"] });
      const snapshots = new Map<string, Followup[]>();

      for (const [key, data] of queries) {
        if (data) {
          snapshots.set(JSON.stringify(key), data);
          queryClient.setQueryData(
            key,
            data.map((f) =>
              f.id === id
                ? { ...f, completado, completado_at: completado ? new Date().toISOString() : null }
                : f
            )
          );
        }
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(JSON.parse(key), data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["fups"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("followups").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["fups"] });
      const queries = queryClient.getQueriesData<Followup[]>({ queryKey: ["fups"] });
      const snapshots = new Map<string, Followup[]>();

      for (const [key, data] of queries) {
        if (data) {
          snapshots.set(JSON.stringify(key), data);
          queryClient.setQueryData(
            key,
            data.filter((f) => f.id !== id)
          );
        }
      }
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(JSON.parse(key), data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["fups"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
