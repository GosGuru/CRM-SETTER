import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await getSupabase().auth.getUser();
      if (!authUser) return null;

      const { data, error } = await getSupabase()
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) throw error;
      return data as User;
    },
  });
}

export function useClosers() {
  return useQuery({
    queryKey: ["closers"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("users")
        .select("*")
        .eq("role", "closer")
        .order("full_name");
      if (error) throw error;
      return data as User[];
    },
  });
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as User[];
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; full_name?: string; avatar_url?: string | null }) => {
      const { id, ...fields } = updates;
      const { data, error } = await getSupabase()
        .from("users")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { data, error } = await getSupabase()
        .from("users")
        .update({ role })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["closers"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}
