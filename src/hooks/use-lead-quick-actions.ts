import { useCallback } from "react";
import { toast } from "sonner";
import { FUP_REALIZADO_TIPO } from "@/lib/fup-metrics";
import { useBulkCreateInteractions } from "@/hooks/use-interactions";
import { useCurrentUser } from "@/hooks/use-users";
import type { InteractionTipo } from "@/types/database";

export function useLeadQuickActions() {
  const { data: currentUser } = useCurrentUser();
  const bulkInteractions = useBulkCreateInteractions();

  const registerInteraction = useCallback(
    (leadId: string, tipo: InteractionTipo, contenido: string, successMessage: string) => {
      if (!currentUser) {
        toast.error("No se pudo obtener el usuario actual");
        return;
      }

      bulkInteractions.mutate(
        [{ lead_id: leadId, user_id: currentUser.id, tipo, contenido }],
        {
          onSuccess: () => toast.success(successMessage),
          onError: (err) => toast.error(`Error: ${err.message}`),
        }
      );
    },
    [bulkInteractions, currentUser]
  );

  const markFupDone = useCallback(
    (leadId: string, leadName?: string) => {
      registerInteraction(
        leadId,
        FUP_REALIZADO_TIPO,
        "FUP realizado",
        leadName ? `FUP registrado para ${leadName}` : "FUP registrado"
      );
    },
    [registerInteraction]
  );

  const markWhatsAppSent = useCallback(
    (leadId: string, leadName?: string) => {
      registerInteraction(
        leadId,
        "whatsapp",
        "WhatsApp enviado",
        leadName ? `WhatsApp registrado para ${leadName}` : "WhatsApp registrado"
      );
    },
    [registerInteraction]
  );

  const markCallDone = useCallback(
    (leadId: string, leadName?: string) => {
      registerInteraction(
        leadId,
        "llamada",
        "Llamada realizada",
        leadName ? `Llamada registrada para ${leadName}` : "Llamada registrada"
      );
    },
    [registerInteraction]
  );

  return {
    isPending: bulkInteractions.isPending,
    markCallDone,
    markFupDone,
    markWhatsAppSent,
  };
}
