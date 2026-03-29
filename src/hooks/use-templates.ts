import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export interface Template {
  id: string;
  user_id: string;
  nombre: string;
  contenido: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_TEMPLATE_CONFIRMACION = `Hola {nombre}, ¿cómo estás? 👋

Te escribo porque agendaste una llamada con nosotros.

📅 Fecha: {fecha}
🕐 Hora: {hora}
👤 Te va a atender: {closer}

¿Seguís disponible para esa fecha y hora?

Cualquier cosa me avisás. ¡Saludos!`;

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("templates")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Template[];
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: { user_id: string; nombre: string; contenido: string }) => {
      const { data, error } = await getSupabase()
        .from("templates")
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; nombre?: string; contenido?: string }) => {
      const { data, error } = await getSupabase()
        .from("templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase()
        .from("templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
