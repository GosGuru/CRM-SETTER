"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLeads, useBulkUpdateLeads, useBulkDeleteLeads } from "@/hooks/use-leads";
import { useBulkCreateInteractions } from "@/hooks/use-interactions";
import { useBulkCreateFollowups } from "@/hooks/use-followups";
import { useClosers, useCurrentUser } from "@/hooks/use-users";
import { useUIStore } from "@/stores/ui-store";
import { LeadCard } from "@/components/lead-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CSVUpload } from "@/components/csv-upload";
import {
  HiOutlinePlusCircle,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlineArrowPath,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineMagnifyingGlass,
  HiOutlineCalendarDays,
  HiOutlinePaperAirplane,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePhone,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineClipboardDocumentCheck,
} from "react-icons/hi2";
import Link from "next/link";
import type { Lead, LeadEstado } from "@/types/database";
import { toast } from "sonner";

const estados: { value: LeadEstado | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "nuevo", label: "Nuevos" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "cerrado", label: "Cerrados" },
  { value: "pagó", label: "Pagaron" },
];

const estadoOptions: { value: LeadEstado; label: string }[] = [
  { value: "nuevo", label: "Nuevo" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "cerrado", label: "Cerrado" },
  { value: "pagó", label: "Pagó" },
];

function groupByDate(leads: Lead[]): { date: string; label: string; leads: Lead[] }[] {
  const groups = new Map<string, Lead[]>();

  for (const lead of leads) {
    const dateKey = lead.created_at.slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(lead);
  }

  const sorted = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const hoy = new Date().toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  return sorted.map(([date, leads]) => {
    let label: string;
    if (date === hoy) {
      label = "Hoy";
    } else if (date === ayer) {
      label = "Ayer";
    } else {
      label = new Date(date + "T12:00:00").toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    return { date, label, leads };
  });
}

export default function LeadsPage() {
  const filtroEstado = useUIStore((s) => s.filtroEstado);
  const setFiltroEstado = useUIStore((s) => s.setFiltroEstado);
  const { data: leads, isLoading } = useLeads(filtroEstado);
  const { data: closers } = useClosers();
  const { data: currentUser } = useCurrentUser();
  const bulkUpdate = useBulkUpdateLeads();
  const bulkDelete = useBulkDeleteLeads();
  const bulkInteractions = useBulkCreateInteractions();
  const bulkFollowups = useBulkCreateFollowups();

  // Última interacción por lead (para filtro "con notas" y preview en card)
  const { data: interactionsMap } = useQuery({
    queryKey: ["leads-last-interactions"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("interactions")
        .select("lead_id, contenido, tipo, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Mapa: lead_id → última interacción (la primera por orden desc)
      const map = new Map<string, { contenido: string; tipo: string; created_at: string }>();
      for (const row of data ?? []) {
        if (!map.has(row.lead_id)) {
          map.set(row.lead_id, { contenido: row.contenido, tipo: row.tipo, created_at: row.created_at });
        }
      }
      return map;
    },
    staleTime: 60_000,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [search, setSearch] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [seguimientoPickerOpen, setSeguimientoPickerOpen] = useState(false);
  const [fupPickerOpen, setFupPickerOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("todos");
  const [filterDateOpen, setFilterDateOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [soloConNotas, setSoloConNotas] = useState(false);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.nombre.toLowerCase().includes(q) ||
          l.celular?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.instagram?.toLowerCase().includes(q)
      );
    }
    if (dateFilter !== "todos") {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

      if (dateFilter === "hoy") {
        result = result.filter((l) => l.created_at.slice(0, 10) === todayStr);
      } else if (dateFilter === "ayer") {
        result = result.filter((l) => l.created_at.slice(0, 10) === yesterdayStr);
      } else if (dateFilter === "semana") {
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
        result = result.filter((l) => l.created_at.slice(0, 10) >= weekAgo);
      } else {
        // custom YYYY-MM-DD
        result = result.filter((l) => l.created_at.slice(0, 10) === dateFilter);
      }
    }
    if (soloConNotas && interactionsMap) {
      result = result.filter((l) => interactionsMap.has(l.id));
    }
    return result;
  }, [leads, search, dateFilter, soloConNotas, interactionsMap]);

  const grouped = useMemo(() => groupByDate(filteredLeads), [filteredLeads]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInDate = (dateLeads: Lead[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = dateLeads.every((l) => next.has(l.id));
      if (allSelected) {
        dateLeads.forEach((l) => next.delete(l.id));
      } else {
        dateLeads.forEach((l) => next.add(l.id));
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleBulkEstado = (estado: string | null) => {
    if (!estado || selected.size === 0) return;
    bulkUpdate.mutate(
      { ids: [...selected], updates: { estado: estado as LeadEstado } },
      {
        onSuccess: () => {
          toast.success(`${selected.size} lead(s) actualizados a "${estado}"`);
          exitSelectMode();
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  const handleBulkCloser = (closerId: string | null) => {
    if (!closerId || selected.size === 0) return;
    bulkUpdate.mutate(
      { ids: [...selected], updates: { closer_id: closerId } },
      {
        onSuccess: () => {
          toast.success(`Closer asignado a ${selected.size} lead(s)`);
          exitSelectMode();
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    bulkDelete.mutate([...selected], {
      onSuccess: () => {
        toast.success(`${selected.size} lead(s) eliminados`);
        exitSelectMode();
      },
      onError: (err) => toast.error(`Error: ${err.message}`),
    });
  };

  const handleBulkDate = (date: Date) => {
    if (!date || selected.size === 0) return;
    const isoDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, 0, 0
    ).toISOString();
    bulkUpdate.mutate(
      { ids: [...selected], updates: { created_at: isoDate } },
      {
        onSuccess: () => {
          toast.success(`Fecha actualizada en ${selected.size} lead(s)`);
          setDatePickerOpen(false);
          exitSelectMode();
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  const handleBulkSeguimiento = (date: Date) => {
    if (!date || selected.size === 0 || !currentUser) return;
    const fechaCall = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0
    ).toISOString();
    bulkUpdate.mutate(
      { ids: [...selected], updates: { estado: "seguimiento", fecha_call: fechaCall } },
      {
        onSuccess: () => {
          const label = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
          const interactions = [...selected].map((leadId) => ({
            lead_id: leadId,
            user_id: currentUser.id,
            tipo: "cambio_estado" as const,
            contenido: `Seguimiento programado para ${label}`,
          }));
          bulkInteractions.mutate(interactions);
          toast.success(`Seguimiento para ${selected.size} lead(s) → ${date.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}`);
          setSeguimientoPickerOpen(false);
          exitSelectMode();
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  const handleBulkQuickAction = (
    tipo: "llamada" | "whatsapp" | "calendario_enviado",
    contenido: string
  ) => {
    if (selected.size === 0 || !currentUser) return;
    const interactions = [...selected].map((leadId) => ({
      lead_id: leadId,
      user_id: currentUser.id,
      tipo,
      contenido,
    }));
    bulkInteractions.mutate(interactions, {
      onSuccess: () => {
        toast.success(`"${contenido}" registrado en ${selected.size} lead(s)`);
      },
      onError: (err) => toast.error(`Error: ${err.message}`),
    });
  };

  const handleBulkEstadoQuick = (estado: LeadEstado, label: string) => {
    if (selected.size === 0 || !currentUser) return;
    bulkUpdate.mutate(
      { ids: [...selected], updates: { estado } },
      {
        onSuccess: () => {
          const interactions = [...selected].map((leadId) => ({
            lead_id: leadId,
            user_id: currentUser.id,
            tipo: "cambio_estado" as const,
            contenido: `Estado cambiado a: ${estado}`,
          }));
          bulkInteractions.mutate(interactions);
          toast.success(`${selected.size} lead(s) → ${label}`);
          exitSelectMode();
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  const isPending = bulkUpdate.isPending || bulkDelete.isPending || bulkInteractions.isPending || bulkFollowups.isPending;

  const handleBulkFupManana = () => {
    if (selected.size === 0 || !currentUser) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const fups = [...selected].map((leadId) => ({
      lead_id: leadId,
      user_id: currentUser.id,
      fecha_programada: tomorrowStr,
    }));
    bulkFollowups.mutate(fups, {
      onSuccess: () => {
        toast.success(`FUP programado para mañana en ${selected.size} lead(s)`);
        exitSelectMode();
      },
      onError: (err) => toast.error(`Error: ${err.message}`),
    });
  };

  const handleBulkFupDate = (date: Date) => {
    if (!date || selected.size === 0 || !currentUser) return;
    const fechaStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const fups = [...selected].map((leadId) => ({
      lead_id: leadId,
      user_id: currentUser.id,
      fecha_programada: fechaStr,
    }));
    bulkFollowups.mutate(fups, {
      onSuccess: () => {
        toast.success(`FUP programado para ${date.toLocaleDateString("es-AR", { day: "numeric", month: "long" })} en ${selected.size} lead(s)`);
        setFupPickerOpen(false);
        exitSelectMode();
      },
      onError: (err) => toast.error(`Error: ${err.message}`),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-blur-fade">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HiOutlineUsers className="h-6 w-6 text-primary" />
          Leads
        </h1>
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectMode(true)}
                className="cursor-pointer"
              >
                <HiOutlineCheckCircle className="mr-1 h-4 w-4" />
                Seleccionar
              </Button>
              <CSVUpload />
              <Link href="/leads/new">
                <Button className="cursor-pointer">
                  <HiOutlinePlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Lead
                </Button>
              </Link>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={exitSelectMode}
              className="cursor-pointer"
            >
              <HiOutlineXMark className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, celular, email o Instagram…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Barra de acciones en masa */}
      {selectMode && selected.size > 0 && (
        <Card className="animate-blur-in-scale">
          <CardContent className="space-y-3 py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                {selected.size} seleccionado(s)
              </Badge>

              {/* Acciones rápidas */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleBulkQuickAction("whatsapp", "FUP enviado")}
                  className="cursor-pointer h-8 text-xs"
                >
                  <HiOutlineChatBubbleLeftRight className="mr-1 h-3.5 w-3.5" />
                  FUP
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleBulkQuickAction("calendario_enviado", "Calendario enviado")}
                  className="cursor-pointer h-8 text-xs"
                >
                  <HiOutlinePaperAirplane className="mr-1 h-3.5 w-3.5" />
                  Calendario
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleBulkFupManana}
                  className="cursor-pointer h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <HiOutlineClipboardDocumentCheck className="mr-1 h-3.5 w-3.5" />
                  FUP Mañana
                </Button>
                <Popover open={fupPickerOpen} onOpenChange={setFupPickerOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="cursor-pointer h-8 text-xs"
                      />
                    }
                  >
                    <HiOutlineClipboardDocumentCheck className="mr-1 h-3.5 w-3.5" />
                    Programar FUP
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={(day) => { if (day) handleBulkFupDate(day); }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      defaultMonth={new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Popover open={seguimientoPickerOpen} onOpenChange={setSeguimientoPickerOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="cursor-pointer h-8 text-xs"
                      />
                    }
                  >
                    <HiOutlineClock className="mr-1 h-3.5 w-3.5" />
                    Seguimiento
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={(day) => { if (day) handleBulkSeguimiento(day); }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      defaultMonth={new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleBulkEstadoQuick("seguimiento", "Agendó")}
                  className="cursor-pointer h-8 text-xs"
                >
                  <HiOutlineCalendarDays className="mr-1 h-3.5 w-3.5" />
                  Agendó
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleBulkEstadoQuick("pagó", "Pagó")}
                  className="cursor-pointer h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
                >
                  <HiOutlineBanknotes className="mr-1 h-3.5 w-3.5" />
                  Pagó
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select onValueChange={handleBulkEstado}>
                <SelectTrigger className="w-40 h-8 cursor-pointer">
                  <div className="flex items-center gap-1">
                    <HiOutlineArrowPath className="h-3 w-3" />
                    <span className="text-xs">Cambiar estado</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {estadoOptions.map((e) => (
                    <SelectItem key={e.value} value={e.value} className="cursor-pointer">
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {closers && closers.length > 0 && (
                <Select onValueChange={handleBulkCloser}>
                  <SelectTrigger className="w-44 h-8 cursor-pointer">
                    <div className="flex items-center gap-1">
                      <HiOutlineUserCircle className="h-3 w-3" />
                      <span className="text-xs">Asignar closer</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {closers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      className="cursor-pointer h-8"
                    />
                  }
                >
                  <HiOutlineCalendarDays className="mr-1 h-3 w-3" />
                  <span className="text-xs">Cambiar fecha</span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    onSelect={(day) => {
                      if (day) handleBulkDate(day);
                    }}
                    defaultMonth={new Date()}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isPending}
                className="cursor-pointer ml-auto"
              >
                <HiOutlineTrash className="mr-1 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros por estado + fecha */}
      <div className="flex flex-col gap-3">
        <Tabs
          value={filtroEstado}
          onValueChange={(v) => setFiltroEstado(v as LeadEstado | "todos")}
        >
          <TabsList>
            {estados.map((e) => (
              <TabsTrigger key={e.value} value={e.value} className="cursor-pointer">
                {e.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "todos", label: "Todas las fechas" },
            { key: "hoy", label: "Hoy" },
            { key: "ayer", label: "Ayer" },
            { key: "semana", label: "Últimos 7 días" },
          ].map((opt) => (
            <Button
              key={opt.key}
              variant={dateFilter === opt.key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDateFilter(opt.key);
                setCustomDate(null);
              }}
              className="cursor-pointer h-7 text-xs rounded-full px-3"
            >
              {opt.label}
            </Button>
          ))}

          <Button
            variant={soloConNotas ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloConNotas((v) => !v)}
            className="cursor-pointer h-7 text-xs rounded-full px-3 gap-1.5"
          >
            <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
            Con notas
          </Button>

          <Popover open={filterDateOpen} onOpenChange={setFilterDateOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant={dateFilter !== "todos" && dateFilter !== "hoy" && dateFilter !== "ayer" && dateFilter !== "semana" ? "default" : "outline"}
                  size="sm"
                  className="cursor-pointer h-7 text-xs rounded-full px-3 gap-1.5"
                />
              }
            >
              <HiOutlineCalendarDays className="h-3.5 w-3.5" />
              {customDate
                ? customDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                : "Elegir día"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDate ?? undefined}
                onSelect={(day) => {
                  if (day) {
                    setCustomDate(day);
                    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                    setDateFilter(key);
                  }
                  setFilterDateOpen(false);
                }}
                defaultMonth={customDate ?? new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Lista de leads agrupada por fecha */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(({ date, label, leads: dateLeads }) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground capitalize">
                    {label}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {dateLeads.length}
                  </Badge>
                </div>
                {selectMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectAllInDate(dateLeads)}
                    className="text-xs h-7 cursor-pointer"
                  >
                    {dateLeads.every((l) => selected.has(l.id))
                      ? "Deseleccionar todos"
                      : "Seleccionar todos"}
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {dateLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    selectable={selectMode}
                    selected={selected.has(lead.id)}
                    onToggle={toggleSelect}
                    lastNote={interactionsMap?.get(lead.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay leads
            {filtroEstado !== "todos" ? ` con estado "${filtroEstado}"` : ""}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
