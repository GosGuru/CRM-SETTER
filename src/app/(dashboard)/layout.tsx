import { Sidebar } from "@/components/sidebar";
import { QuickAddLeadDialog } from "@/components/quick-add-lead-dialog";
import { GlobalActionBar } from "@/components/global-action-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <GlobalActionBar />
        <div className="p-4 md:p-6 animate-blur-fade">{children}</div>
      </main>
      <QuickAddLeadDialog />
    </div>
  );
}
