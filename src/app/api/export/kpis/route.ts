import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

const CASH_PER_AGENDA = 32;

const MONTH_NAMES_ES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2020) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const supabase = await createClient();

  // Build date range for the whole month
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayDate = new Date(year, month, 0); // day 0 of next month = last day of this month
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

  const rangeStart = `${firstDay}T00:00:00`;
  const rangeEnd = `${lastDay}T23:59:59`;

  // Fetch all data for the month in parallel
  const [
    { data: leads },
    { data: followupsData },
    { data: interactions },
    { data: agendaLeads },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, created_at")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("followups")
      .select("fecha_programada")
      .gte("fecha_programada", firstDay)
      .lte("fecha_programada", lastDay),
    supabase
      .from("interactions")
      .select("tipo, created_at")
      .eq("tipo", "calendario_enviado")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("leads")
      .select("id, fecha_call_set_at")
      .not("fecha_call_set_at", "is", null)
      .gte("fecha_call_set_at", rangeStart)
      .lte("fecha_call_set_at", rangeEnd),
  ]);

  // Build daily rows
  const rows: {
    fecha: string;
    mes: string;
    inbound: number;
    fups: number;
    cal: number;
    calls: number;
    tasa: string;
    cash: number;
  }[] = [];

  const totalDays = lastDayDate.getDate();
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    const inbound = (leads ?? []).filter(
      (l: { created_at: string }) => l.created_at >= dayStart && l.created_at <= dayEnd
    ).length;

    const fups = (followupsData ?? []).filter(
      (f: { fecha_programada: string }) => f.fecha_programada === dateStr
    ).length;

    const cal = (interactions ?? []).filter(
      (i: { created_at: string }) => i.created_at >= dayStart && i.created_at <= dayEnd
    ).length;

    const calls = (agendaLeads ?? []).filter(
      (l: { fecha_call_set_at: string }) =>
        l.fecha_call_set_at >= dayStart && l.fecha_call_set_at <= dayEnd
    ).length;

    const tasa = inbound > 0 ? `${((calls / inbound) * 100).toFixed(2)}%` : "0.00%";
    const cash = calls * CASH_PER_AGENDA;

    // Format fecha as MM/DD/YY
    const fechaLabel = `${String(month).padStart(2, "0")}/${String(d).padStart(2, "0")}/${String(year).slice(-2)}`;

    rows.push({
      fecha: fechaLabel,
      mes: MONTH_NAMES_ES[month],
      inbound,
      fups,
      cal,
      calls,
      tasa,
      cash,
    });
  }

  // ---- Build Excel ----
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CRM MAXI";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("KPIs");

  // ---- Column widths (match HTML template) ----
  ws.columns = [
    { key: "A", width: 14 }, // Fecha
    { key: "B", width: 14 }, // Mes
    { key: "C", width: 16 }, // Calificadas
    { key: "D", width: 16 }, // Inbound Nuevo
    { key: "E", width: 12 }, // FUPS
    { key: "F", width: 22 }, // CALENDARIOS ENVIADOS
    { key: "G", width: 18 }, // CALLS AGENDADAS
    { key: "H", width: 16 }, // Tasa de Agenda
    { key: "I", width: 16 }, // Cash Collected
  ];

  // ---- Row 1: title ----
  ws.mergeCells("B2:I3");
  const titleCell = ws.getCell("B2");
  titleCell.value = "Números y Kpis";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF980000" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.border = {
    bottom: { style: "medium" },
    right: { style: "medium" },
  };

  // ---- Row 4: headers ----
  const headerRow = ws.getRow(4);
  const headers = [
    { col: "A", label: "Fecha", yellow: false },
    { col: "B", label: "Mes", yellow: false },
    { col: "C", label: "Calificadas", yellow: true },
    { col: "D", label: "Inbound Nuevo", yellow: true },
    { col: "E", label: "FUPS", yellow: false },
    { col: "F", label: "CALENDARIOS ENVIADOS", yellow: false },
    { col: "G", label: "CALLS AGENDADAS", yellow: false },
    { col: "H", label: "Tasa de Agenda", yellow: false },
    { col: "I", label: "Cash Collected", yellow: false },
  ];

  for (const h of headers) {
    const cell = ws.getCell(`${h.col}4`);
    cell.value = h.label;
    cell.font = {
      name: "Roboto, Arial",
      size: 12,
      bold: true,
      color: { argb: "FF000000" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: h.yellow ? "FFFFF2CC" : "FFFFF2CC" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "medium" },
      right: { style: h.col === "I" ? "medium" : "thin" },
      top: { style: "thin" },
      left: { style: "thin" },
    };
  }
  headerRow.height = 28;

  // ---- Data rows ----
  rows.forEach((row, idx) => {
    const excelRow = idx + 5; // data starts at row 5
    const isLast = idx === rows.length - 1;

    const fechaCell = ws.getCell(`A${excelRow}`);
    fechaCell.value = row.fecha;
    fechaCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF000000" } };
    fechaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
    fechaCell.alignment = { vertical: "middle", horizontal: "center" };
    fechaCell.border = {
      bottom: isLast ? { style: "medium" } : { style: "thin" },
      right: { style: "medium" },
    };

    const dataStyle = (value: string | number, center = true) => ({
      value,
      font: { name: "Arial", size: 10, color: { argb: "FF000000" } } as ExcelJS.Font,
      fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } },
      alignment: { vertical: "middle" as const, horizontal: (center ? "center" : "left") as ExcelJS.Alignment["horizontal"], wrapText: true },
      border: {
        bottom: isLast ? { style: "medium" as const } : { style: "thin" as const },
        right: { style: "medium" as const },
      },
    });

    const cols: [string, string | number][] = [
      ["B", row.mes],
      ["C", ""], // Calificadas — manual
      ["D", row.inbound],
      ["E", row.fups],
      ["F", row.cal],
      ["G", row.calls],
      ["H", row.tasa],
      ["I", row.cash === 0 ? "" : `$${row.cash}`],
    ];

    for (const [col, val] of cols) {
      const c = ws.getCell(`${col}${excelRow}`);
      const s = dataStyle(val);
      c.value = s.value;
      c.font = s.font;
      c.fill = s.fill;
      c.alignment = s.alignment;
      c.border = s.border;
    }

    ws.getRow(excelRow).height = 20;
  });

  // ---- Freeze top 4 rows for scrolling ----
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 4 }];

  // ---- Serialize ----
  const buffer = await workbook.xlsx.writeBuffer();

  const monthLabel = MONTH_NAMES_ES[month];
  const filename = `KPIs_${monthLabel}_${year}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
