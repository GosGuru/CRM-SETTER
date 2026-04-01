"use client";

import { use, useState } from "react";
import { localDateStr } from "@/lib/utils";
import { useLead, useUpdateLead } from "@/hooks/use-leads";
import { useInteractions, useCreateInteraction, useDeleteInteraction } from "@/hooks/use-interactions";
import { useLeadFollowups } from "@/hooks/use-followups";
import { useClosers, useCurrentUser } from "@/hooks/use-users";
import { PreCallSheet } from "@/components/pre-call-sheet";
import { ScheduleFupDialog } from "@/components/schedule-fup-dialog";

import { CalendlyDataForm } from "@/components/calendly-data-form";
import { StatusBadge } from "@/components/status-badge";
import { PaymentSection } from "@/components/payment-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePhone,
  HiOutlineArrowPath,
  HiOutlinePaperAirplane,
  HiOutlineCalendarDays,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineClipboardDocumentCheck,
  HiOutlineTrash,
} from "react-icons/hi2";
import Link from "next/link";
import type { LeadEstado, InteractionTipo } from "@/types/database";

const estados: { value: LeadEstado; label: string }[] = [
  { value: "nuevo", label: "Nuevo" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "cerrado", label: "Cerrado" },
  { value: "pagó", label: "Pagó" },
];

const interactionIcons: Record<InteractionTipo, React.ElementType> = {
  nota: HiOutlineChatBubbleLeftRight,
  llamada: HiOutlinePhone,
  whatsapp: HiOutlineChatBubbleLeftRight,
  cambio_estado: HiOutlineArrowPath,
  calendario_enviado: HiOutlinePaperAirplane,
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: lead, isLoading } = useLead(id);
  const { data: interactions } = useInteractions(id);
  const { data: closers } = useClosers();
  const { data: currentUser } = useCurrentUser();
  const updateLead = useUpdateLead();
  const createInteraction = useCreateInteraction();
  const deleteInteraction = useDeleteInteraction();
  const { data: leadFups } = useLeadFollowups(id);

  const [newNote, setNewNote] = useState("");
  const [seguimientoOpen, setSeguimientoOpen] = useState(false);
  const [fupDialogOpen, setFupDialogOpen] = useState(false);
  const [fupDefaultDate, setFupDefaultDate] = useState<string | undefined>();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrow);

  const handleFupManana = () => {
    setFupDefaultDate(tomorrowStr);
    setFupDialogOpen(true);
  };

  const handleProgramarFup = () => {
    setFupDefaultDate(undefined);
    setFupDialogOpen(true);
  };

  const handleSeguimiento = (date: Date) => {
    if (!lead || !currentUser) return;
    const fechaCall = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0
    ).toISOString();
    updateLead.mutate(
      { id: lead.id, estado: "seguimiento", fecha_call: fechaCall, fecha_call_set_at: new Date().toISOString() },
      {
        onSuccess: () => {
          createInteraction.mutate({
            lead_id: lead.id,
            user_id: currentUser.id,
            tipo: "cambio_estado",
            contenido: `Seguimiento programado para ${date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}`,
          });
          toast.success(`Seguimiento programado para ${date.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}`);
          setSeguimientoOpen(false);
        },
      }
    );
  };

  const quickAction = (tipo: "llamada" | "whatsapp" | "calendario_enviado", contenido: string) => {
    if (!currentUser || !lead) return;
    createInteraction.mutate(
      { lead_id: lead.id, user_id: currentUser.id, tipo, contenido },
      {
        onSuccess: () => toast.success("Acción registrada"),
        onError: (err) => toast.error(`Error: ${err instanceof Error ? err.message : "desconocido"}`),
      }
    );
  };

  const handleDeleteInteraction = (interactionId: string) => {
    deleteInteraction.mutate(
      { id: interactionId, lead_id: id },
      {
        onSuccess: () => toast.success("Interacción eliminada"),
        onError: (err) => toast.error(`No se pudo eliminar: ${err instanceof Error ? err.message : "error desconocido"}`),
      }
    );
  };

  const handleEstadoChange = (nuevoEstado: LeadEstado) => {
    if (!lead || !currentUser) return;

    updateLead.mutate(
      { id: lead.id, estado: nuevoEstado },
      {
        onSuccess: () => {
          createInteraction.mutate({
            lead_id: lead.id,
            user_id: currentUser.id,
            tipo: "cambio_estado",
            contenido: `Estado cambiado a: ${nuevoEstado}`,
          });
          toast.success(`Estado actualizado a "${nuevoEstado}"`);
        },
        onError: (err) => toast.error(`No se pudo cambiar estado: ${err instanceof Error ? err.message : "error"}`),
      }
    );
  };

  const handleCloserChange = (closerId: string | null) => {
    if (!lead || !closerId) return;
    updateLead.mutate(
      { id: lead.id, closer_id: closerId },
      {
        onSuccess: () => toast.success("Closer asignado"),
        onError: (err) => toast.error(`No se pudo asignar: ${err instanceof Error ? err.message : "error"}`),
      }
    );
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !currentUser || !lead) return;

    createInteraction.mutate(
      {
        lead_id: lead.id,
        user_id: currentUser.id,
        tipo: "nota",
        contenido: newNote.trim(),
      },
      {
        onSuccess: () => {
          setNewNote("");
          toast.success("Nota agregada");
        },
        onError: (err) => toast.error(`Error al guardar nota: ${err instanceof Error ? err.message : "error"}`),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Lead no encontrado
      </div>
    );
  }

  const tieneAgenda = !!lead.fecha_call;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-blur-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HiOutlineArrowLeft className="mr-1 h-4 w-4" />
          Volver a leads
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-semibold">{lead.nombre}</span>
          <StatusBadge estado={lead.estado} />
          {leadFups && leadFups.length > 0 && (
            <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50">
              <HiOutlineClipboardDocumentCheck className="mr-1 h-3 w-3" />
              FUP: {new Date(leadFups[0].fecha_programada + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </Badge>
          )}
        </div>
      </div>

      {/* FUP Dialog — shared across both sections */}
      <ScheduleFupDialog
        leadId={id}
        open={fupDialogOpen}
        onOpenChange={setFupDialogOpen}
        defaultDate={fupDefaultDate}
      />

      {/* Contenido condicional: sin agenda vs con agenda */}
      {!tieneAgenda ? (
        /* ---- MODO SIN AGENDA: formulario para cargar datos de Calendly ---- */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CalendlyDataForm lead={lead} />

          <div className="space-y-6">
            {/* Acciones rápidas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={createInteraction.isPending}
                  onClick={() => quickAction("whatsapp", "FUP enviado")}
                >
                  <HiOutlineChatBubbleLeftRight className="mr-1.5 h-4 w-4" /> FUP
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={createInteraction.isPending}
                  onClick={() => quickAction("llamada", "Llamada realizada")}
                >
                  <HiOutlinePhone className="mr-1.5 h-4 w-4" /> Llamada
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={createInteraction.isPending}
                  onClick={() => quickAction("calendario_enviado", "Calendario enviado")}
                >
                  <HiOutlinePaperAirplane className="mr-1.5 h-4 w-4" /> Calendario
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={handleFupManana}
                >
                  <HiOutlineClipboardDocumentCheck className="mr-1.5 h-4 w-4" /> FUP Mañana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleProgramarFup}
                >
                  <HiOutlineClipboardDocumentCheck className="mr-1.5 h-4 w-4" /> Programar FUP
                </Button>
                <Popover open={seguimientoOpen} onOpenChange={setSeguimientoOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={updateLead.isPending}
                      />
                    }
                  >
                    <HiOutlineClock className="mr-1.5 h-4 w-4" /> Seguimiento
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={(day) => { if (day) handleSeguimiento(day); }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      defaultMonth={new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={updateLead.isPending}
                  onClick={() => handleEstadoChange("seguimiento")}
                >
                  <HiOutlineCalendarDays className="mr-1.5 h-4 w-4" /> Agendó
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-green-600 border-green-200 hover:bg-green-50"
                  disabled={updateLead.isPending}
                  onClick={() => handleEstadoChange("pagó")}
                >
                  <HiOutlineBanknotes className="mr-1.5 h-4 w-4" /> Pagó
                </Button>
              </CardContent>
            </Card>

            {/* Pago del programa */}
            <PaymentSection key={`ps-${lead.id}-${lead.updated_at}`} lead={lead} />

            {/* Agregar nota */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Agregar nota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribí una nota sobre este lead..."
                  rows={3}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || createInteraction.isPending}
                  className="w-full cursor-pointer"
                  variant="secondary"
                >
                  Agregar nota
                </Button>
              </CardContent>
            </Card>

            {/* Historial */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Historial</CardTitle>
              </CardHeader>
              <CardContent>
                {interactions && interactions.length > 0 ? (
                  <div className="space-y-3">
                    {interactions.map((interaction) => {
                      const Icon = interactionIcons[interaction.tipo];
                      return (
                        <div key={interaction.id} className="flex gap-3 group">
                          <div className="mt-0.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{interaction.contenido}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {interaction.user?.full_name ?? "Usuario"} ·{" "}
                              {new Date(interaction.created_at).toLocaleString(
                                "es-AR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteInteraction(interaction.id)}
                            disabled={deleteInteraction.isPending}
                            aria-label="Eliminar interacción"
                            className="shrink-0 self-start mt-0.5 p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin interacciones registradas
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ---- MODO CON AGENDA: ficha pre-call + WhatsApp + acciones ---- */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda: Ficha + WhatsApp */}
          <div className="space-y-6">
            <PreCallSheet lead={lead} />
          </div>

          {/* Columna derecha: Acciones + Historial */}
          <div className="space-y-6">
            {/* Acciones rápidas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={createInteraction.isPending}
                  onClick={() => quickAction("llamada", "Llamada realizada")}
                >
                  <HiOutlinePhone className="mr-1.5 h-4 w-4" /> Llamada
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={createInteraction.isPending}
                  onClick={() => quickAction("whatsapp", "WhatsApp enviado")}
                >
                  <HiOutlineChatBubbleLeftRight className="mr-1.5 h-4 w-4" /> WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={createInteraction.isPending}
                  onClick={() => quickAction("calendario_enviado", "Calendario enviado")}
                >
                  <HiOutlinePaperAirplane className="mr-1.5 h-4 w-4" /> Calendario
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={handleFupManana}
                >
                  <HiOutlineClipboardDocumentCheck className="mr-1.5 h-4 w-4" /> FUP Mañana
                </Button>
                <Popover open={seguimientoOpen} onOpenChange={setSeguimientoOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={updateLead.isPending}
                      />
                    }
                  >
                    <HiOutlineClock className="mr-1.5 h-4 w-4" /> Seguimiento
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={(day) => { if (day) handleSeguimiento(day); }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      defaultMonth={new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={updateLead.isPending}
                  onClick={() => handleEstadoChange("seguimiento")}
                >
                  <HiOutlineCheckCircle className="mr-1.5 h-4 w-4" /> Agendó
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-green-600 border-green-200 hover:bg-green-50"
                  disabled={updateLead.isPending}
                  onClick={() => handleEstadoChange("pagó")}
                >
                  <HiOutlineBanknotes className="mr-1.5 h-4 w-4" /> Pagó
                </Button>
              </CardContent>
            </Card>

            {/* Cambiar estado */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Estado del lead</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={lead.estado}
                  onValueChange={(v) => handleEstadoChange(v as LeadEstado)}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((e) => (
                      <SelectItem key={e.value} value={e.value} className="cursor-pointer">
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Asignar closer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Closer asignado</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={lead.closer_id ?? ""}
                  onValueChange={handleCloserChange}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Seleccionar closer" />
                  </SelectTrigger>
                  <SelectContent>
                    {closers?.map((closer) => (
                      <SelectItem key={closer.id} value={closer.id} className="cursor-pointer">
                        {closer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Pago del programa */}
            <PaymentSection key={`ps2-${lead.id}-${lead.updated_at}`} lead={lead} />

            {/* Agregar nota */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Agregar nota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribí una nota sobre este lead..."
                  rows={3}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || createInteraction.isPending}
                  className="w-full cursor-pointer"
                  variant="secondary"
                >
                  Agregar nota
                </Button>
              </CardContent>
            </Card>

            {/* Historial */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Historial</CardTitle>
              </CardHeader>
              <CardContent>
                {interactions && interactions.length > 0 ? (
                  <div className="space-y-3">
                    {interactions.map((interaction) => {
                      const Icon = interactionIcons[interaction.tipo];
                      return (
                        <div key={interaction.id} className="flex gap-3 group">
                          <div className="mt-0.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{interaction.contenido}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {interaction.user?.full_name ?? "Usuario"} ·{" "}
                              {new Date(interaction.created_at).toLocaleString(
                                "es-AR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteInteraction(interaction.id)}
                            disabled={deleteInteraction.isPending}
                            aria-label="Eliminar interacción"
                            className="shrink-0 self-start mt-0.5 p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin interacciones registradas
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
