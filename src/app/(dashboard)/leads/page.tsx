"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createClient } from "@/lib/supabase/client";
import { localDateStr } from "@/lib/utils";
import {
  useInfiniteLeads,
  useBulkUpdateLeads,
  useBulkDeleteLeads,
  useTogglePin,
  useUpdateLead,
  type SortOption,
} from "@/hooks/use-leads";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  HiOutlineBarsArrowDown,
  HiOutlineBarsArrowUp,
  HiOutlineArrowUturnLeft,
} from "react-icons/hi2";
import { ArrowDownAZ, ArrowUpZA, ListFilter, Star } from "lucide-react";
import type { Lead, LeadEstado } from "@/types/database";
import { toast } from "sonner";

const estados: { value: LeadEstado | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "nuevo", label: "Nuevos" },
  { value: "agendó", label: "Agendados" },
  { value: "cerrado", label: "Cerrados" },
  { value: "pagó", label: "Pagaron" },
];

const estadoOptions: { value: LeadEstado; label: string }[] = [
  { value: "nuevo", label: "Nuevo" },
  { value: "agendó", label: "Agendado" },
  { value: "cerrado", label: "Cerrado" },
  { value: "pagó", label: "Pagó" },
];

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "recientes", label: "Recientes", icon: <HiOutlineBarsArrowDown className="h-3.5 w-3.5" /> },
  { value: "antiguos", label: "Antiguos", icon: <HiOutlineBarsArrowUp className="h-3.5 w-3.5" /> },
  { value: "az", label: "A → Z", icon: <ArrowDownAZ className="h-3.5 w-3.5" /> },
  { value: "za", label: "Z → A", icon: <ArrowUpZA className="h-3.5 w-3.5" /> },
  { value: "calificados", label: "Calificados", icon: <Star className="h-3.5 w-3.5" /> },
];

function qualificationScore(lead: Lead): number {
  let score = 0;
  if (lead.celular) score++;
  if (lead.email) score++;
  if (lead.edad) score++;
  if (lead.trabajo) score++;
  if (lead.instagram) score++;
  if (lead.respuestas) score++;
  if (lead.objetivo) score++;
  if (lead.decisor) score++;
  if (lead.inversion_ok) score++;
  if (lead.compromiso) score++;
  if (lead.fecha_call) score += 2;
  return score;
}

function groupByDate(leads: Lead[]): { date: string; label: string; leads: Lead[] }[] {
  const groups = new Map<string, Lead[]>();

  for (const lead of leads) {
    // Parse the UTC timestamp and convert to local date to avoid cross-midnight mis-grouping
    const dateKey = localDateStr(new Date(lead.created_at));
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(lead);
  }

  const sorted = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const hoy = localDateStr();
  const ayerDate = new Date(); ayerDate.setDate(ayerDate.getDate() - 1);
  const ayer = localDateStr(ayerDate);

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

function groupByScheduleDate(leads: Lead[]): { date: string; label: string; leads: Lead[] }[] {
  const groups = new Map<string, Lead[]>();

  for (const lead of leads) {
    // Fall back to updated_at for leads scheduled before fecha_call_set_at was tracked
    const ts = lead.fecha_call_set_at ?? lead.updated_at;
    if (!ts) continue;
    const dateKey = localDateStr(new Date(ts));
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(lead);
  }

  const sorted = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const hoy = localDateStr();
  const ayerDate = new Date(); ayerDate.setDate(ayerDate.getDate() - 1);
  const ayer = localDateStr(ayerDate);

  return sorted.map(([date, leads]) => {
    let label: string;
    if (date === hoy) {
      label = "📅 Agendados Hoy";
    } else if (date === ayer) {
      label = "📅 Agendados Ayer";
    } else {
      label = "📅 " + new Date(date + "T12:00:00").toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    return { date, label, leads };
  });
}

// ── Virtual item types ────────────────────────────────────────────
type FlatItem =
  | { type: "date-header"; date: string; label: string; dateLeads: Lead[] }
  | { type: "lead"; lead: Lead; date: string };

// Estimated heights for the virtualizer
const HEADER_HEIGHT = 36;
const LEAD_HEIGHT = 100;

export default function LeadsPage() {
  const filtroEstado = useUIStore((s) => s.filtroEstado);
  const setFiltroEstado = useUIStore((s) => s.setFiltroEstado);
  const { data: closers } = useClosers();
  const { data: currentUser } = useCurrentUser();
  const bulkUpdate = useBulkUpdateLeads();
  const bulkDelete = useBulkDeleteLeads();
  const togglePin = useTogglePin();
  const updateLead = useUpdateLead();
  const bulkInteractions = useBulkCreateInteractions();
  const bulkFollowups = useBulkCreateFollowups();

  // ── Search debounce (180 ms) ───────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 180);
    return () => clearTimeout(t);
  }, [search]);

  // ── Filters & sort ────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState<string>("todos");
  const [filterDateOpen, setFilterDateOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [soloConNotas, setSoloConNotas] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recientes");
  const [vistaAgendados, setVistaAgendados] = useState(false);

  // ── Per-card date picker state ────────────────────────────────
  const [cardDatePicker, setCardDatePicker] = useState<{ leadId: string; type: "crm" | "agenda" } | null>(null);

  const isSearching = debouncedSearch.trim().length > 0;

  // ── Infinite leads query (server-side filters + search + pagination) ───
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteLeads({
    filtroEstado,
    search: debouncedSearch || undefined,
    // When vistaAgendados is active, ignore the date filter (show all scheduled)
    dateFilter: vistaAgendados ? "todos" : dateFilter,
    sortBy: vistaAgendados ? "agendados" : sortBy,
    soloAgendados: vistaAgendados,
  });

  // Flatten pages
  const allLeads = useMemo(() => {
    const flat = data?.pages.flat() ?? [];
    if (sortBy === "calificados") {
      return [...flat].sort((a, b) => qualificationScore(b) - qualificationScore(a));
    }
    return flat;
  }, [data, sortBy]);

  const isListLoading = isLoading;

  // ── Interactions map — only for loaded lead IDs ───────────────
  const loadedIds = useMemo(() => allLeads.map((l) => l.id), [allLeads]);
  const shouldFetchInteractions = loadedIds.length > 0 && !isSearching;

  const { data: interactionsMap } = useQuery({
    queryKey: ["leads-last-interactions", shouldFetchInteractions ? loadedIds : []],
    queryFn: async () => {
      if (loadedIds.length === 0) return new Map<string, { contenido: string; tipo: string; created_at: string }>();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("interactions")
        .select("lead_id, contenido, tipo, created_at")
        .in("lead_id", loadedIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { contenido: string; tipo: string; created_at: string }>();
      for (const row of data ?? []) {
        if (!map.has(row.lead_id)) {
          map.set(row.lead_id, { contenido: row.contenido, tipo: row.tipo, created_at: row.created_at });
        }
      }
      return map;
    },
    staleTime: 60_000,
    enabled: shouldFetchInteractions,
  });

  const activeRestrictiveFilters =
    (filtroEstado !== "todos" ? 1 : 0) +
    (dateFilter !== "todos" && !vistaAgendados ? 1 : 0) +
    (soloConNotas ? 1 : 0) +
    (vistaAgendados ? 1 : 0);

  // ── Build flat virtual items array ────────────────────────────
  const useDateGrouping = sortBy === "recientes" || sortBy === "antiguos" || vistaAgendados;

  const flatItems = useMemo((): FlatItem[] => {
    const leads = soloConNotas && interactionsMap
      ? allLeads.filter((l) => interactionsMap.has(l.id))
      : allLeads;

    if (!useDateGrouping) {
      return leads.map((lead) => ({
        type: "lead" as const,
        lead,
        date: lead.created_at.slice(0, 10),
      }));
    }

    const groups = vistaAgendados ? groupByScheduleDate(leads) : groupByDate(leads);
    const items: FlatItem[] = [];
    for (const { date, label, leads: dateLeads } of groups) {
      items.push({ type: "date-header", date, label, dateLeads });
      for (const lead of dateLeads) {
        items.push({ type: "lead", lead, date });
      }
    }
    return items;
  }, [allLeads, useDateGrouping, vistaAgendados, soloConNotas, interactionsMap]);

  // ── Virtualizer setup ─────────────────────────────────────────
  const listContainerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    scrollElementRef.current = document.querySelector("main");
  }, []);

  // Compute the offset of the list container from the top of <main>
  // useLayoutEffect prevents a one-frame misplacement when data first loads
  useLayoutEffect(() => {
    const update = () => {
      if (!listContainerRef.current || !scrollElementRef.current) return;
      const mainRect = scrollElementRef.current.getBoundingClientRect();
      const listRect = listContainerRef.current.getBoundingClientRect();
      setScrollMargin(listRect.top - mainRect.top + scrollElementRef.current.scrollTop);
    };
    update();
  }, [isListLoading, flatItems.length]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) =>
      flatItems[index]?.type === "date-header" ? HEADER_HEIGHT : LEAD_HEIGHT,
    overscan: 5,
    scrollMargin,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  // ── Infinite scroll observer ──────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bottomRef.current || !hasNextPage || isFetchingNextPage) return;
    const root = scrollElementRef.current ?? undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { threshold: 0, rootMargin: "300px", root }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Bulk selection ────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [seguimientoPickerOpen, setSeguimientoPickerOpen] = useState(false);
  const [agendadoPickerOpen, setAgendadoPickerOpen] = useState(false);
  const [fupPickerOpen, setFupPickerOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTogglePin = (id: string, pinned: boolean) => {
    togglePin.mutate({ id, pinned });
  };

  const handleCardAction = (leadId: string, action: string) => {
    const now = new Date().toISOString();
    switch (action) {
      case "agendo":
        updateLead.mutate(
          { id: leadId, estado: "agendó", fecha_call_set_at: now },
          { onSuccess: () => toast.success("Lead marcado como Agendó") }
        );
        break;
      case "desagendar":
        updateLead.mutate(
          { id: leadId, estado: "nuevo", fecha_call_set_at: null as unknown as string },
          { onSuccess: () => toast.success("Lead desagendado") }
        );
        break;
      case "pago_reunion":
        updateLead.mutate(
          { id: leadId, pago_reunion: true },
          { onSuccess: () => toast.success("Pago de reunión registrado") }
        );
        break;
      case "nuevo":
        updateLead.mutate(
          { id: leadId, estado: "nuevo" },
          { onSuccess: () => toast.success("Lead movido a Nuevo") }
        );
        break;
      case "cerrado":
        updateLead.mutate(
          { id: leadId, estado: "cerrado" },
          { onSuccess: () => toast.success("Lead marcado como Cerrado") }
        );
        break;
      case "fecha_crm":
        setCardDatePicker({ leadId, type: "crm" });
        break;
      case "fecha_agenda":
        setCardDatePicker({ leadId, type: "agenda" });
        break;
      case "delete":
        bulkDelete.mutate(
          [leadId],
          { onSuccess: () => toast.success("Lead eliminado") }
        );
        break;
    }
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

  const handleBulkAgendadoDate = (date: Date) => {
    if (!date || selected.size === 0) return;
    const isoDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, 0, 0
    ).toISOString();
    bulkUpdate.mutate(
      { ids: [...selected], updates: { fecha_call_set_at: isoDate } },
      {
        onSuccess: () => {
          const label = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
          toast.success(`Fecha de agenda actualizada → ${label}`);
          setAgendadoPickerOpen(false);
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
      { ids: [...selected], updates: { estado: "agendó", fecha_call: fechaCall, fecha_call_set_at: new Date().toISOString() } },
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
          toast.success(`Agendado para ${selected.size} lead(s) → ${date.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}`);
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

  const handleBulkDesagendar = () => {
    if (selected.size === 0 || !currentUser) return;
    bulkUpdate.mutate(
      { ids: [...selected], updates: { estado: "nuevo", fecha_call_set_at: null } },
      {
        onSuccess: () => {
          const interactions = [...selected].map((leadId) => ({
            lead_id: leadId,
            user_id: currentUser.id,
            tipo: "cambio_estado" as const,
            contenido: "Desagendado — volvió a Nuevo",
          }));
          bulkInteractions.mutate(interactions);
          toast.success(`${selected.size} lead(s) desagendado(s)`);
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
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-blur-fade">
        <h1 className="text-2xl font-bold flex items-center gap-2 shrink-0">
          <HiOutlineUsers className="h-6 w-6 text-primary" />
          Leads
        </h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:block">
            <CSVUpload />
          </div>
          <Button 
            className="cursor-pointer h-9 px-3 md:px-4 shrink-0 transition-all" 
            onClick={() => useUIStore.getState().setQuickAddOpen(true)}
          >
            <HiOutlinePlusCircle className="mr-1 sm:mr-2 h-4 w-4" />
            <span>Nuevo Lead</span>
          </Button>

          {/* CSV en móvil */}
          <div className="flex sm:hidden">
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 cursor-pointer" />
                }
              >
                <HiOutlineArrowPath className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-2 flex flex-col gap-2">
                <CSVUpload />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros — sticky */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="flex items-center gap-2 w-full animate-blur-fade">
        <div className="relative flex-1 min-w-0">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, celular, email o ig..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 w-full rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/30 transition-shadow"
          />
          {isFetching && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary ${search ? "right-10" : "right-3"}`}
              aria-hidden
            />
          )}
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <HiOutlineXMark className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
            variant={selectMode ? "secondary" : "outline"}
            className="h-10 px-3 shrink-0 cursor-pointer rounded-xl bg-background"
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
          >
            {selectMode ? (
              <>
                <HiOutlineXMark className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Cancelar</span>
              </>
            ) : (
              <>
                <HiOutlineCheckCircle className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Seleccionar</span>
              </>
            )}
          </Button>

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                className="h-10 px-3 sm:px-4 shrink-0 cursor-pointer rounded-xl bg-background"
              />
            }
          >
            <ListFilter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filtros</span>
            {activeRestrictiveFilters > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {activeRestrictiveFilters}
              </span>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="sm:max-w-md mx-auto rounded-t-2xl max-h-[90vh] overflow-y-auto px-6 py-6 ring-1 ring-border">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle className="text-xl">Filtros y Orden</SheetTitle>
              <SheetDescription>
                Ajusta qué leads deseas visualizar en tu lista.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-8">
              {/* Filtro por estado */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-foreground/90 uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  Estado del Lead
                </label>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {estados.map((e) => (
                    <Button
                      key={e.value}
                      variant={filtroEstado === e.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroEstado(e.value as LeadEstado | "todos")}
                      className={`cursor-pointer h-9 px-4 rounded-xl flex-1 sm:flex-none justify-center transition-colors ${filtroEstado === e.value ? "shadow-sm" : "hover:bg-muted"}`}
                    >
                      {e.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Filtro por fecha y notas */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-foreground/90 uppercase tracking-wider flex items-center gap-2">
                  <HiOutlineCalendarDays className="h-4 w-4 text-muted-foreground" />
                  Fecha de Creación
                </label>
                <div className="flex items-center gap-2 flex-wrap">
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
                      className={`cursor-pointer h-9 px-4 rounded-xl transition-colors ${dateFilter === opt.key ? "shadow-sm" : "hover:bg-muted"}`}
                    >
                      {opt.label}
                    </Button>
                  ))}

                  <Popover open={filterDateOpen} onOpenChange={setFilterDateOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant={dateFilter !== "todos" && dateFilter !== "hoy" && dateFilter !== "ayer" && dateFilter !== "semana" ? "default" : "outline"}
                          size="sm"
                          className="cursor-pointer h-9 px-4 rounded-xl gap-2 transition-colors"
                        />
                      }
                    >
                      <HiOutlineCalendarDays className="h-4 w-4" />
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

                  <Button
                    variant={soloConNotas ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSoloConNotas((v) => !v)}
                    className={`cursor-pointer h-9 px-4 rounded-xl gap-2 transition-colors ${soloConNotas ? "shadow-sm bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-500" : "hover:bg-muted"}`}
                  >
                    <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
                    Con notas
                  </Button>
                </div>
              </div>

              {/* Vista Agendados */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-foreground/90 uppercase tracking-wider flex items-center gap-2">
                  <HiOutlineCalendarDays className="h-4 w-4 text-muted-foreground" />
                  Vista de Agendados
                </label>
                <Button
                  variant={vistaAgendados ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setVistaAgendados((v) => !v);
                    if (!vistaAgendados) {
                      // Reset date filter when switching to agendados view
                      setDateFilter("todos");
                      setCustomDate(null);
                    }
                  }}
                  className={`cursor-pointer h-9 px-4 rounded-xl gap-2 w-full sm:w-auto transition-colors ${vistaAgendados ? "shadow-sm bg-blue-600 hover:bg-blue-700 border-blue-600" : "hover:bg-muted"}`}
                >
                  <HiOutlineCalendarDays className="h-4 w-4" />
                  {vistaAgendados ? "✓ Mostrando Agendados" : "Ver todos los Agendados"}
                </Button>
                {vistaAgendados && (
                  <p className="text-xs text-muted-foreground">
                    Muestra todos los leads agendados, agrupados por día en que se agendaron. Ignora el filtro de fecha de creación.
                  </p>
                )}
              </div>

              {/* Ordenamiento */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-foreground/90 uppercase tracking-wider flex items-center gap-2">
                  <HiOutlineBarsArrowDown className="h-4 w-4 text-muted-foreground" />
                  Ordenado
                </label>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {sortOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={sortBy === opt.value ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSortBy(opt.value)}
                      className={`cursor-pointer h-9 px-4 rounded-xl justify-start sm:justify-center gap-2 transition-colors ${sortBy === opt.value ? "ring-1 ring-border shadow-sm" : ""}`}
                    >
                      {opt.icon}
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      </div>

      {/* Barra de acciones en masa — fija y compacta */}
      {selectMode && selected.size > 0 && typeof window !== "undefined" && createPortal(
        <div className="fixed bottom-3 left-1/2 md:left-[calc(50%+8rem)] z-40 w-[min(96vw,1100px)] md:w-[min(calc(100vw-18rem),1100px)] -translate-x-1/2 rounded-2xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 shadow-[0_10px_30px_rgba(0,0,0,0.14)] animate-in slide-in-from-bottom-2 duration-200">
          <div className="px-3 py-2.5 space-y-2">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <Badge variant="secondary" className="text-sm shrink-0 justify-self-start">
                {selected.size} seleccionado(s)
              </Badge>

              {/* Acciones rápidas */}
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-1.5 pr-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleBulkQuickAction("llamada", "Llamada realizada")}
                    className="cursor-pointer h-8 text-xs"
                  >
                    <HiOutlinePhone className="mr-1 h-3.5 w-3.5" />
                    Llamada
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleBulkQuickAction("whatsapp", "WhatsApp enviado")}
                    className="cursor-pointer h-8 text-xs"
                  >
                    <HiOutlineChatBubbleLeftRight className="mr-1 h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleBulkQuickAction("calendario_enviado", "Calendario enviado")}
                    className="cursor-pointer h-8 text-xs"
                  >
                    <HiOutlinePaperAirplane className="mr-1 h-3.5 w-3.5" />
                    Cal
                  </Button>
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
                    <PopoverContent className="w-auto p-0" side="top">
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
                    onClick={() => handleBulkEstadoQuick("agendó", "Agendó")}
                    className="cursor-pointer h-8 text-xs"
                  >
                    <HiOutlineCalendarDays className="mr-1 h-3.5 w-3.5" />
                    Agendó
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={handleBulkDesagendar}
                    className="cursor-pointer h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <HiOutlineArrowUturnLeft className="mr-1 h-3.5 w-3.5" />
                    Desagendar
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

              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectMode}
                className="cursor-pointer h-8 w-8 shrink-0 px-0"
                title="Cerrar selección"
                aria-label="Cerrar selección"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 pr-1">
                <Select onValueChange={handleBulkEstado}>
                  <SelectTrigger className="w-36 h-8 cursor-pointer text-xs">
                    <div className="flex items-center gap-1">
                      <HiOutlineArrowPath className="h-3.5 w-3.5" />
                      <span>Cambiar estado</span>
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
                    <SelectTrigger className="w-40 h-8 cursor-pointer text-xs">
                      <div className="flex items-center gap-1">
                        <HiOutlineUserCircle className="h-3.5 w-3.5" />
                        <span>Asignar closer</span>
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
                        className="cursor-pointer h-8 text-xs"
                      />
                    }
                  >
                    <HiOutlineCalendarDays className="mr-1 h-3.5 w-3.5" />
                    <span>Cambiar fecha</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" side="top">
                    <Calendar
                      mode="single"
                      onSelect={(day) => { if (day) handleBulkDate(day); }}
                      defaultMonth={new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <Popover open={agendadoPickerOpen} onOpenChange={setAgendadoPickerOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="cursor-pointer h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                      />
                    }
                  >
                    <HiOutlineCalendarDays className="mr-1 h-3.5 w-3.5" />
                    <span>Fecha agendado</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" side="top">
                    <div className="p-2 text-xs text-muted-foreground border-b">
                      Cambiar cuándo se agendó (para Vista Agendados)
                    </div>
                    <Calendar
                      mode="single"
                      onSelect={(day) => { if (day) handleBulkAgendadoDate(day); }}
                      defaultMonth={new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleBulkFupManana}
                  className="cursor-pointer h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <HiOutlineClipboardDocumentCheck className="mr-1 h-3.5 w-3.5" />
                  FUP mañana
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isPending}
                  className="cursor-pointer h-8 text-xs"
                >
                  <HiOutlineTrash className="mr-1 h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Spacer so sticky bottom bar doesn't overlap last card */}
      <div style={{ paddingBottom: selectMode && selected.size > 0 ? "8rem" : 0 }} />
      {/* Lista de leads — virtualizada */}
      {isListLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <span className="text-sm">Cargando leads...</span>
        </div>
      ) : flatItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isSearching
              ? `No encontramos "${debouncedSearch}" en ningún lead. Probá con otra parte del nombre, celular o @ig.`
              : "No hay leads"
                + (filtroEstado !== "todos" ? ` con estado "${filtroEstado}"` : "")}
          </CardContent>
        </Card>
      ) : (
        <div ref={listContainerRef}>
          {/* Flat list header (non-grouped) */}
          {!useDateGrouping && (
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                {allLeads.length} leads{hasNextPage ? "+" : ""}
              </Badge>
              {selectMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelected((prev) => {
                      const allSelected = allLeads.every((l) => prev.has(l.id));
                      if (allSelected) return new Set<string>();
                      return new Set(allLeads.map((l) => l.id));
                    });
                  }}
                  className="text-xs h-7 cursor-pointer"
                >
                  {allLeads.every((l) => selected.has(l.id))
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </Button>
              )}
            </div>
          )}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const item = flatItems[vItem.index];
              return (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vItem.start - scrollMargin}px)`,
                  }}
                >
                  {item.type === "date-header" ? (
                    <div className="flex items-center justify-between mb-2 pt-4 first:pt-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-muted-foreground capitalize">
                          {item.label}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {item.dateLeads.length}
                        </Badge>
                      </div>
                      {selectMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectAllInDate(item.dateLeads)}
                          className="text-xs h-7 cursor-pointer"
                        >
                          {item.dateLeads.every((l) => selected.has(l.id))
                            ? "Deseleccionar todos"
                            : "Seleccionar todos"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="pb-1.5">
                      <LeadCard
                        lead={item.lead}
                        selectable={selectMode}
                        selected={selected.has(item.lead.id)}
                        onToggle={toggleSelect}
                        onTogglePin={handleTogglePin}
                        lastNote={interactionsMap?.get(item.lead.id)}
                        onAction={handleCardAction}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={bottomRef} className="h-4" />

          {/* Spinner for next page */}
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          )}
        </div>
      )}

      {/* Per-card date picker dialog */}
      <Dialog
        open={!!cardDatePicker}
        onOpenChange={(open) => {
          if (!open) setCardDatePicker(null);
        }}
      >
        <DialogContent className="w-auto max-w-sm p-0 overflow-hidden" showCloseButton={false}>
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-center">
              {cardDatePicker?.type === "crm" ? "Cambiar fecha de CRM" : "Cambiar fecha de agenda"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <Calendar
              mode="single"
              onSelect={(date) => {
                if (!date || !cardDatePicker) return;
                if (cardDatePicker.type === "crm") {
                  updateLead.mutate(
                    { id: cardDatePicker.leadId, created_at: date.toISOString() },
                    { onSuccess: () => toast.success("Fecha de CRM actualizada") }
                  );
                } else {
                  updateLead.mutate(
                    { id: cardDatePicker.leadId, fecha_call_set_at: date.toISOString() },
                    { onSuccess: () => toast.success("Fecha de agenda actualizada") }
                  );
                }
                setCardDatePicker(null);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer mt-3 w-full"
              onClick={() => setCardDatePicker(null)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
