"use client";

import { useState, useRef } from "react";
import { useBulkCreateLeads } from "@/hooks/use-leads";
import { useCurrentUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { HiOutlineCloudArrowUp, HiOutlineDocumentText, HiOutlineXMark, HiOutlineCheck } from "react-icons/hi2";

function parseCSV(text: string): string[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const names: string[] = [];

  for (const line of lines) {
    // Soporta: "Nombre\tFecha", "Nombre,Fecha", o solo "Nombre"
    const parts = line.split(/[,\t]/);
    const name = parts[0]?.trim();
    if (name && name.toLowerCase() !== "nombre") {
      names.push(name);
    }
  }

  return names;
}

export function CSVUpload() {
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: currentUser } = useCurrentUser();
  const bulkCreate = useBulkCreateLeads();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setNames(parsed);
    };
    reader.readAsText(file);
  };

  const removeName = (index: number) => {
    setNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    if (!currentUser || names.length === 0) return;

    bulkCreate.mutate(
      names.map((nombre) => ({
        nombre,
        setter_id: currentUser.id,
      })),
      {
        onSuccess: (result) => {
          const { created, duplicates } = result;
          if (duplicates.length > 0) {
            toast.warning(
              `${created.length} importados. ${duplicates.length} duplicado${duplicates.length !== 1 ? "s" : ""} omitido${duplicates.length !== 1 ? "s" : ""}: ${duplicates.slice(0, 5).join(", ")}${duplicates.length > 5 ? "..." : ""}`
            );
          } else {
            toast.success(`${created.length} leads importados correctamente`);
          }
          setNames([]);
          setFileName("");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err.message || "Error al importar leads");
        },
      }
    );
  };

  const handleReset = () => {
    setNames([]);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer">
        <HiOutlineCloudArrowUp className="h-4 w-4" />
        Importar CSV
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar leads desde CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Subí un archivo .csv con los nombres de los leads. Puede tener
            columnas extra (se ignoran), solo se toma la primera columna como nombre.
          </p>

          {/* File input */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <HiOutlineDocumentText className="mr-2 h-4 w-4" />
              {fileName || "Elegir archivo"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={handleFile}
            />
            {fileName && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="cursor-pointer"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Preview */}
          {names.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {names.length} lead{names.length !== 1 ? "s" : ""} encontrado{names.length !== 1 ? "s" : ""}:
              </p>
              <div className="max-h-60 overflow-y-auto rounded-md border p-2 space-y-1">
                {names.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted"
                  >
                    <span>{name}</span>
                    <button
                      onClick={() => removeName(i)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <HiOutlineXMark className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          {names.length > 0 && (
            <Button
              onClick={handleImport}
              className="w-full cursor-pointer"
              disabled={bulkCreate.isPending}
            >
              <HiOutlineCheck className="mr-2 h-4 w-4" />
              {bulkCreate.isPending
                ? "Importando..."
                : `Importar ${names.length} lead${names.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
