import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-4 pt-16 md:p-6 md:pt-6 animate-blur-fade">{children}</div>
      </main>
    </div>
  );
}
