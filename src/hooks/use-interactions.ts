import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Interaction } from "@/types/database";

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export function useInteractions(leadId: string) {
  return useQuery({
    queryKey: ["interactions", leadId],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("interactions")
        .select("*, user:users(*)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Interaction[];
    },
    enabled: !!leadId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      interaction: Omit<Interaction, "id" | "created_at" | "user">
    ) => {
      const { data, error } = await getSupabase()
        .from("interactions")
        .insert(interaction)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interactions", variables.lead_id],
      });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-history"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-detail"] });
    },
  });
}

export function useBulkCreateInteractions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      interactions: Omit<Interaction, "id" | "created_at" | "user">[]
    ) => {
      const { data, error } = await getSupabase()
        .from("interactions")
        .insert(interactions)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-history"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-detail"] });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, lead_id }: { id: string; lead_id: string }) => {
      const { error } = await getSupabase()
        .from("interactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, lead_id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interactions", variables.lead_id],
      });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-history"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-detail"] });
    },
  });
}
