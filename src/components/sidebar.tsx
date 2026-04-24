"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiOutlineUserPlus,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineRocketLaunch,
} from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: HiOutlineSquares2X2 },
  { name: "Leads", href: "/leads", icon: HiOutlineUsers },
  { name: "Estructura", href: "/leads/new/estructura", icon: HiOutlineClipboardDocumentList },
  { name: "Configuración", href: "/settings", icon: HiOutlineCog6Tooth },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const activeHref = navigation
    .filter((item) => item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const isActive = (href: string) => {
    return activeHref === href;
  };

  return (
    <>
      {/* Botón hamburguesa móvil */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 border border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground shadow-sm backdrop-blur md:hidden cursor-pointer"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {sidebarOpen ? <HiOutlineXMark className="h-5 w-5" /> : <HiOutlineBars3 className="h-5 w-5" />}
      </Button>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-blur-fade"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/98 shadow-xl backdrop-blur transition-transform duration-200 md:translate-x-0 md:static md:z-auto md:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-sidebar-border/90 bg-sidebar px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <HiOutlineRocketLaunch className="h-5 w-5 text-primary" />
            CRM
          </Link>
        </div>

        <div className="space-y-2 border-b border-sidebar-border/90 px-3 py-3">
          <button
            type="button"
            onClick={() => {
              useUIStore.getState().setQuickAddOpen(true);
              setSidebarOpen(false);
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors duration-200 hover:bg-primary/90 cursor-pointer md:hidden"
          >
            <HiOutlineUserPlus className="h-4.5 w-4.5" />
            Agregar Lead
          </button>

          <Link
            href="/leads/new"
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-full items-center justify-center rounded-lg border border-sidebar-border bg-sidebar px-3 text-sm font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent"
          >
            Formulario Completo
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive(item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border/90 bg-sidebar px-3 py-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 cursor-pointer"
          >
            <HiOutlineArrowRightOnRectangle className="h-4.5 w-4.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
