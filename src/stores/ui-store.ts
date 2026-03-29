import { create } from "zustand";
import type { LeadEstado } from "@/types/database";

interface UIState {
  // Filtros del dashboard
  fechaSeleccionada: string; // ISO date string
  vistaLeads: "tabla" | "kanban";
  filtroEstado: LeadEstado | "todos";

  // Sidebar móvil
  sidebarOpen: boolean;

  // Actions
  setFechaSeleccionada: (fecha: string) => void;
  setVistaLeads: (vista: "tabla" | "kanban") => void;
  setFiltroEstado: (estado: LeadEstado | "todos") => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  fechaSeleccionada: new Date().toISOString().split("T")[0],
  vistaLeads: "tabla",
  filtroEstado: "todos",
  sidebarOpen: false,

  setFechaSeleccionada: (fecha) => set({ fechaSeleccionada: fecha }),
  setVistaLeads: (vista) => set({ vistaLeads: vista }),
  setFiltroEstado: (estado) => set({ filtroEstado: estado }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
