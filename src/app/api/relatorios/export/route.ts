import { NextResponse } from "next/server";
import { assertPermission, AuthorizationError } from "@/server/auth/session";
import { logActivity } from "@/server/services/activity";
import { buildExportRows, EXPORT_TYPES, resolveRange, toCsv, type ExportType } from "@/server/services/reports";

export async function GET(req: Request) {
  try {
    const user = await assertPermission("reports.view");
    const url = new URL(req.url);
    const type = url.searchParams.get("type") as ExportType | null;
    if (!type || !(type in EXPORT_TYPES)) return NextResponse.json({ error: "Tipo de relatório inválido." }, { status: 400 });
    const range = resolveRange({
      de: url.searchParams.get("de") ?? undefined,
      ate: url.searchParams.get("ate") ?? undefined,
      periodo: url.searchParams.get("periodo") ?? undefined,
    });
    const rows = await buildExportRows(type, range);
    const fromStr = range.from.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const toStr = range.to.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    await logActivity({
      userId: user.id,
      action: "report.export",
      entity: "Report",
      summary: `Exportou relatório "${EXPORT_TYPES[type]}" (${fromStr} a ${toStr}, ${rows.length - 1} linhas)`,
    });
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-${type}-${fromStr}_${toStr}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthorizationError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("[report-export]", err);
    return NextResponse.json({ error: "Falha ao gerar relatório." }, { status: 500 });
  }
}
