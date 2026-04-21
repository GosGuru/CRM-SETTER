import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

const CASH_PER_AGENDA = 32;
const DEFAULT_EXPORT_TIMEZONE = "America/Argentina/Buenos_Aires";

const MONTH_NAMES_ES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

type AgendaLeadExportRow = {
  id: string;
  nombre: string;
  fecha_call: string | null;
  fecha_call_set_at: string;
};

function resolveExportTimeZone(rawTz: string | null): string {
  if (!rawTz) return DEFAULT_EXPORT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: rawTz });
    return rawTz;
  } catch {
    return DEFAULT_EXPORT_TIMEZONE;
  }
}

function toDateKeyInTimeZone(isoValue: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoValue));

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function toDatePartsInTimeZone(isoValue: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoValue));

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${lookup("day")}/${lookup("month")}/${lookup("year")}`,
    time: `${lookup("hour")}:${lookup("minute")}`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const tzParam = searchParams.get("tz");

  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2020) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const supabase = await createClient();

  // Build date range:
  // - Current month/year: from day 1 to today (month-to-date)
  // - Any other month/year: full month
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayDate = new Date(year, month, 0); // day 0 of next month = last day of this month
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const lastDayNumber = isCurrentMonth
    ? Math.min(now.getDate(), lastDayDate.getDate())
    : lastDayDate.getDate();
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;
  const exportTimeZone = resolveExportTimeZone(tzParam);

  // Add a 1-day safety margin because grouping is done in the selected timezone.
  // This avoids cutting records near UTC day boundaries.
  const rangeStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - 24 * 60 * 60 * 1000).toISOString();
  const rangeEnd = new Date(Date.UTC(year, month - 1, lastDayNumber, 23, 59, 59, 999) + 24 * 60 * 60 * 1000).toISOString();

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
      .select("id, nombre, fecha_call, fecha_call_set_at")
      .not("fecha_call_set_at", "is", null)
      .gte("fecha_call_set_at", rangeStart)
      .lte("fecha_call_set_at", rangeEnd)
      .order("fecha_call_set_at", { ascending: false }),
  ]);

  const inboundByDay = new Map<string, number>();
  for (const lead of leads ?? []) {
    const key = toDateKeyInTimeZone((lead as { created_at: string }).created_at, exportTimeZone);
    if (key >= firstDay && key <= lastDay) {
      inboundByDay.set(key, (inboundByDay.get(key) ?? 0) + 1);
    }
  }

  const calByDay = new Map<string, number>();
  for (const interaction of interactions ?? []) {
    const key = toDateKeyInTimeZone((interaction as { created_at: string }).created_at, exportTimeZone);
    if (key >= firstDay && key <= lastDay) {
      calByDay.set(key, (calByDay.get(key) ?? 0) + 1);
    }
  }

  const callsByDay = new Map<string, number>();
  for (const agendaLead of agendaLeads ?? []) {
    const key = toDateKeyInTimeZone((agendaLead as { fecha_call_set_at: string }).fecha_call_set_at, exportTimeZone);
    if (key >= firstDay && key <= lastDay) {
      callsByDay.set(key, (callsByDay.get(key) ?? 0) + 1);
    }
  }

  const filteredAgendaLeads = (agendaLeads ?? []).filter((agendaLead) => {
    const key = toDateKeyInTimeZone(
      (agendaLead as { fecha_call_set_at: string }).fecha_call_set_at,
      exportTimeZone
    );
    return key >= firstDay && key <= lastDay;
  }) as AgendaLeadExportRow[];

  const fupsByDay = new Map<string, number>();
  for (const followup of followupsData ?? []) {
    const key = (followup as { fecha_programada: string }).fecha_programada;
    if (key >= firstDay && key <= lastDay) {
      fupsByDay.set(key, (fupsByDay.get(key) ?? 0) + 1);
    }
  }

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

  const totalDays = lastDayNumber;
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const inbound = inboundByDay.get(dateStr) ?? 0;
    const fups = fupsByDay.get(dateStr) ?? 0;
    const cal = calByDay.get(dateStr) ?? 0;
    const calls = callsByDay.get(dateStr) ?? 0;

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

    const fechaCell = ws.getCell(`A${excelRow}`);
    fechaCell.value = row.fecha;
    fechaCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF000000" } };
    fechaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
    fechaCell.alignment = { vertical: "middle", horizontal: "center" };
    fechaCell.border = {
      bottom: { style: "thin" },
      right: { style: "medium" },
    };

    const dataStyle = (value: string | number, center = true) => ({
      value,
      font: { name: "Arial", size: 10, color: { argb: "FF000000" } } as ExcelJS.Font,
      fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } },
      alignment: { vertical: "middle" as const, horizontal: (center ? "center" : "left") as ExcelJS.Alignment["horizontal"], wrapText: true },
      border: {
        bottom: { style: "thin" as const },
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

  // ---- Totals row (month aggregate) ----
  const totals = rows.reduce(
    (acc, row) => ({
      inbound: acc.inbound + row.inbound,
      fups: acc.fups + row.fups,
      cal: acc.cal + row.cal,
      calls: acc.calls + row.calls,
      cash: acc.cash + row.cash,
    }),
    { inbound: 0, fups: 0, cal: 0, calls: 0, cash: 0 }
  );
  const totalTasa = totals.inbound > 0 ? `${((totals.calls / totals.inbound) * 100).toFixed(2)}%` : "0.00%";
  const totalRowNumber = rows.length + 5;
  const totalCols: [string, string | number][] = [
    ["A", "TOTAL MES"],
    ["B", MONTH_NAMES_ES[month]],
    ["C", ""],
    ["D", totals.inbound],
    ["E", totals.fups],
    ["F", totals.cal],
    ["G", totals.calls],
    ["H", totalTasa],
    ["I", totals.cash === 0 ? "" : `$${totals.cash}`],
  ];

  for (const [col, value] of totalCols) {
    const cell = ws.getCell(`${col}${totalRowNumber}`);
    cell.value = value;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE8B6" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: col === "I" ? "medium" : "thin" },
      left: col === "A" ? { style: "medium" } : { style: "thin" },
    };
  }
  ws.getRow(totalRowNumber).height = 22;

  // ---- Freeze top 4 rows for scrolling ----
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 4 }];

  // ---- Leads Agendados worksheet ----
  const agendadosWs = workbook.addWorksheet("Leads Agendados");
  agendadosWs.columns = [
    { key: "fechaAgendado", width: 18 },
    { key: "horaAgendado", width: 16 },
    { key: "lead", width: 34 },
    { key: "fechaCall", width: 18 },
    { key: "horaCall", width: 16 },
  ];

  const monthLabel = MONTH_NAMES_ES[month];
  agendadosWs.mergeCells("A1:E1");
  const agendadosTitleCell = agendadosWs.getCell("A1");
  agendadosTitleCell.value = `Leads Agendados — ${monthLabel} ${year}`;
  agendadosTitleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  agendadosTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  agendadosTitleCell.alignment = { vertical: "middle", horizontal: "left" };

  agendadosWs.mergeCells("A2:E2");
  const periodCell = agendadosWs.getCell("A2");
  periodCell.value = `Período: ${firstDay} a ${lastDay}`;
  periodCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
  periodCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDFA" } };
  periodCell.alignment = { vertical: "middle", horizontal: "left" };

  agendadosWs.mergeCells("A3:C3");
  const tzCell = agendadosWs.getCell("A3");
  tzCell.value = `Timezone: ${exportTimeZone}`;
  tzCell.font = { name: "Arial", size: 10, color: { argb: "FF334155" } };
  tzCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  tzCell.alignment = { vertical: "middle", horizontal: "left" };

  agendadosWs.mergeCells("D3:E3");
  const totalAgendadosCell = agendadosWs.getCell("D3");
  totalAgendadosCell.value = `Total agendados: ${filteredAgendaLeads.length}`;
  totalAgendadosCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
  totalAgendadosCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
  totalAgendadosCell.alignment = { vertical: "middle", horizontal: "right" };

  const agendadosHeaders = [
    "Fecha agendado",
    "Hora agendado",
    "Lead",
    "Fecha call",
    "Hora call",
  ];

  agendadosHeaders.forEach((header, index) => {
    const cell = agendadosWs.getCell(4, index + 1);
    cell.value = header;
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });
  agendadosWs.getRow(4).height = 24;

  if (filteredAgendaLeads.length === 0) {
    agendadosWs.mergeCells("A5:E5");
    const emptyCell = agendadosWs.getCell("A5");
    emptyCell.value = "Sin leads agendados en este período";
    emptyCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
    emptyCell.alignment = { vertical: "middle", horizontal: "center" };
    emptyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    emptyCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  } else {
    filteredAgendaLeads.forEach((lead, index) => {
      const rowNumber = index + 5;
      const agendado = toDatePartsInTimeZone(lead.fecha_call_set_at, exportTimeZone);
      const call = lead.fecha_call
        ? toDatePartsInTimeZone(lead.fecha_call, exportTimeZone)
        : null;

      const values = [
        agendado.date,
        agendado.time,
        lead.nombre,
        call?.date ?? "",
        call?.time ?? "",
      ];

      values.forEach((value, cellIndex) => {
        const cell = agendadosWs.getCell(rowNumber, cellIndex + 1);
        cell.value = value;
        cell.font = { name: "Arial", size: 10, color: { argb: "FF0F172A" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: cellIndex === 2 ? "left" : "center",
          wrapText: true,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowNumber % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF" },
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });
  }

  agendadosWs.autoFilter = "A4:E4";
  agendadosWs.views = [{ state: "frozen", xSplit: 0, ySplit: 4 }];

  // ---- Serialize ----
  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `KPIs_y_Agendados_${monthLabel}_${year}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
