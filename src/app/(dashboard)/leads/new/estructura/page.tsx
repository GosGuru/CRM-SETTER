import type { Metadata } from "next";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { StructureWorkspace } from "./_components/structure-workspace";

export const metadata: Metadata = {
  title: "Estructura | CRM Setter/Closer",
  description: "Biblioteca de Método Origen para copiar el paso a paso, follow-ups y objeciones.",
};

export default function StructurePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 animate-blur-in">
      <Link
        href="/leads/new"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HiOutlineArrowLeft className="mr-1 h-4 w-4" />
        Volver a nuevo lead
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Estructura Método Origen</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Tenés el paso a paso del Word ya ordenado para copiar mensajes, follow-ups, objeciones y
          respuestas sin perder el contexto de cada etapa.
        </p>
      </div>

      <StructureWorkspace />
    </div>
  );
}
