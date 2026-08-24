/** K39 — iptal adayları kimler? (salt okuma) */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { bildirimIptalEdilebilirMi } = await import("../src/lib/iade/bildirim");

  const hepsi = await prisma.returnNotice.findMany({
    select: {
      id: true, status: true, returnId: true, createdAt: true,
      reservedQuantity: true,
      sale: { select: { code: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nTOPLAM BILDIRIM: ${hepsi.length}\n`);
  const sayim = new Map<string, number>();
  for (const b of hepsi) sayim.set(b.status, (sayim.get(b.status) ?? 0) + 1);
  for (const [d, n] of [...sayim].sort((a,b)=>b[1]-a[1])) console.log(`  ${d.padEnd(20)} ${n}`);

  const adaylar = hepsi.filter((b) => bildirimIptalEdilebilirMi(b));
  console.log(`\nIPTAL ADAYI (KAPANDI + islenmis iadesi YOK): ${adaylar.length}`);
  for (const b of adaylar) {
    console.log(`  ${(b.sale?.code ?? "—").padEnd(14)} ${b.createdAt.toISOString().slice(0,16).replace("T"," ")} · ayrilan ${b.reservedQuantity}`);
  }

  const kapanmis = hepsi.filter((b) => b.status === "KAPANDI");
  const korunan = kapanmis.filter((b) => b.returnId !== null);
  console.log(`\nKAPANMIS ama KORUNAN (islenmis iadesi VAR): ${korunan.length}`);
  for (const b of korunan) {
    console.log(`  ${(b.sale?.code ?? "—").padEnd(14)} returnId dolu → iptal edilemez`);
  }
}
main();
