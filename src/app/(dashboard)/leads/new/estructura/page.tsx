import type { Metadata } from "next";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { StructureWorkspace } from "./_components/structure-workspace";

export const metadata: Metadata = {
  title: "Estructura | CRM Setter/Closer",
  description: "Biblioteca para pegar, revisar y copiar la estructura completa por pasos.",
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
        <h1 className="text-2xl font-bold tracking-tight">Estructura</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Entrá por paso, pegá el contenido que seguís desde el PDF y copiá exactamente lo que
          necesites sin perder la estructura.
        </p>
      </div>

      <StructureWorkspace />
    </div>
  );
}
