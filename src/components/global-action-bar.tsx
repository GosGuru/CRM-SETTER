"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KPIDetailDialog } from "@/components/kpi-detail-dialog";
import { StatusBadge } from "@/components/status-badge";
import { useLeadQuickActions } from "@/hooks/use-lead-quick-actions";
import { useLeadSearch } from "@/hooks/use-leads";
import { useStats } from "@/hooks/use-stats";
import { useUIStore } from "@/stores/ui-store";
import type { KPIDetailType, Lead } from "@/types/database";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBars3,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMagnifyingGlass,
  HiOutlinePhone,
  HiOutlinePhoneArrowUpRight,
  HiOutlineUserPlus,
  HiOutlineXMark,
} from "react-icons/hi2";

function formatFechaLabel(fecha: string) {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getLeadMeta(lead: Lead) {
  const parts = [lead.celular, lead.email, lead.instagram]
    .filter((value): value is string => Boolean(value?.trim()))
    .slice(0, 2);

  if (parts.length > 0) return parts.join(" · ");
  return lead.closer?.full_name ? `Closer: ${lead.closer.full_name}` : "Sin contacto cargado";
}

function MetricButton({
  colorClass,
  icon: Icon,
  label,
  loading,
  onClick,
  value,
}: {
  colorClass: string;
  icon: ElementType;
  label: string;
  loading: boolean;
  onClick: () => void;
  value: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-w-34"
      aria-label={`Ver detalle de ${label}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4 text-white" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-medium text-muted-foreground">{label}</span>
          <span className="block text-lg font-bold leading-none text-foreground">
            {loading ? "..." : value}
          </span>
        </span>
      </span>
    </button>
  );
}

function LeadResult({
  lead,
  onOpen,
}: {
  lead: Lead;
  onOpen: (leadId: string) => void;
}) {
  const quickActions = useLeadQuickActions();

  return (
    <li className="rounded-xl border bg-background p-2 shadow-sm">
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{lead.nombre}</span>
          <span className="block truncate text-xs text-muted-foreground">{getLeadMeta(lead)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusBadge estado={lead.estado} />
          <HiOutlineArrowTopRightOnSquare className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </span>
      </button>

      <div className="mt-1 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={quickActions.isPending}
          onClick={() => quickActions.markFupDone(lead.id, lead.nombre)}
          className="h-8 min-w-0 cursor-pointer text-xs text-indigo-600 hover:bg-indigo-50"
          aria-label={`Registrar FUP hecho para ${lead.nombre}`}
        >
          <HiOutlineClipboardDocumentCheck className="h-3.5 w-3.5" />
          FUP
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={quickActions.isPending}
          onClick={() => quickActions.markWhatsAppSent(lead.id, lead.nombre)}
          className="h-8 min-w-0 cursor-pointer text-xs"
          aria-label={`Registrar WhatsApp para ${lead.nombre}`}
        >
          <HiOutlineChatBubbleLeftRight className="h-3.5 w-3.5" />
          WA
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={quickActions.isPending}
          onClick={() => quickActions.markCallDone(lead.id, lead.nombre)}
          className="h-8 min-w-0 cursor-pointer text-xs"
          aria-label={`Registrar llamada para ${lead.nombre}`}
        >
          <HiOutlinePhone className="h-3.5 w-3.5" />
          Llamada
        </Button>
      </div>
    </li>
  );
}

export function GlobalActionBar() {
  const pathname = usePathname();
  const router = useRouter();
  const fecha = useUIStore((state) => state.fechaSeleccionada);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const setQuickAddOpen = useUIStore((state) => state.setQuickAddOpen);
  const { data: stats, isLoading: statsLoading } = useStats(fecha);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTipo, setDetailTipo] = useState<KPIDetailType | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const normalizedPath = pathname ? pathname.replace(/\/+$/, "") || "/" : "/";
  const showGlobalSearch = normalizedPath !== "/leads";
  const showQuickAdd = normalizedPath !== "/leads";
  const searchTerm = debouncedSearch.trim();
  const { data: results, isFetching } = useLeadSearch(showGlobalSearch ? searchTerm : "", 8);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 180);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const openDetail = (tipo: KPIDetailType) => {
    setDetailTipo(tipo);
    setDetailOpen(true);
  };

  const openLead = (leadId: string) => {
    setPanelOpen(false);
    setSearch("");
    router.push(`/leads/${leadId}`);
  };

  const kpi = stats?.kpi;
  const showPanel = showGlobalSearch && panelOpen && search.trim().length > 0;
  const searching = search.trim().length >= 2;
  const leadResults = results ?? [];

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="px-3 py-2 md:px-6">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="h-10 w-10 cursor-pointer md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Abrir menú"
          >
            <HiOutlineBars3 className="h-5 w-5" />
          </Button>

          {showGlobalSearch ? (
            <div ref={searchRef} className="relative min-w-0 flex-1 md:max-w-2xl">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPanelOpen(true);
                }}
                onFocus={() => setPanelOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setPanelOpen(false);
                }}
                placeholder="Buscar lead..."
                className="h-10 rounded-xl bg-background pl-9 pr-10 shadow-sm"
                aria-label="Buscar lead"
                aria-expanded={showPanel}
              />
              {isFetching && searching ? (
                <span className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-primary" />
              ) : null}
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPanelOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="Limpiar búsqueda"
                >
                  <HiOutlineXMark className="h-4 w-4" />
                </button>
              ) : null}

              {showPanel ? (
                <div className="fixed left-3 right-3 top-14 z-50 max-h-[min(70vh,430px)] overflow-y-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl md:absolute md:left-0 md:right-0 md:top-full md:mt-2">
                  {!searching ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Escribí al menos 2 caracteres.
                    </p>
                  ) : isFetching && leadResults.length === 0 ? (
                    <div className="space-y-2 p-1">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-20 rounded-xl bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : leadResults.length > 0 ? (
                    <ul className="space-y-2">
                      {leadResults.map((lead) => (
                        <LeadResult key={lead.id} lead={lead} onOpen={openLead} />
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Sin resultados.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          <div className="hidden items-center gap-2 md:flex">
            <MetricButton
              label="Inbound"
              value={kpi?.inbound_nuevo ?? 0}
              loading={statsLoading && !kpi}
              icon={HiOutlineUserPlus}
              colorClass="bg-blue-600"
              onClick={() => openDetail("inbound")}
            />
            <MetricButton
              label="FUPs hechos"
              value={kpi?.fups ?? 0}
              loading={statsLoading && !kpi}
              icon={HiOutlinePhoneArrowUpRight}
              colorClass="bg-indigo-600"
              onClick={() => openDetail("fups")}
            />
          </div>

          {showQuickAdd ? (
            <Button
              type="button"
              variant="default"
              size="lg"
              className="h-10 cursor-pointer rounded-xl px-3 shadow-sm"
              onClick={() => setQuickAddOpen(true)}
              aria-label="Agregar Lead"
            >
              <HiOutlineUserPlus className="h-5 w-5" />
              <span className="hidden lg:inline">Agregar Lead</span>
            </Button>
          ) : null}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 md:hidden">
          <MetricButton
            label="Inbound"
            value={kpi?.inbound_nuevo ?? 0}
            loading={statsLoading && !kpi}
            icon={HiOutlineUserPlus}
            colorClass="bg-blue-600"
            onClick={() => openDetail("inbound")}
          />
          <MetricButton
            label="FUPs hechos"
            value={kpi?.fups ?? 0}
            loading={statsLoading && !kpi}
            icon={HiOutlinePhoneArrowUpRight}
            colorClass="bg-indigo-600"
            onClick={() => openDetail("fups")}
          />
        </div>
      </div>

      <KPIDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tipo={detailTipo}
        fecha={fecha}
        fechaLabel={formatFechaLabel(fecha)}
      />
    </header>
  );
}
