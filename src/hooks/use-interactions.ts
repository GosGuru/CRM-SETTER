import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Interaction } from "@/types/database";

const supabase = createClient();

export function useInteractions(leadId: string) {
  return useQuery({
    queryKey: ["interactions", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
    },
  });
}

export function useBulkCreateInteractions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      interactions: Omit<Interaction, "id" | "created_at" | "user">[]
    ) => {
      const { data, error } = await supabase
        .from("interactions")
        .insert(interactions)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
