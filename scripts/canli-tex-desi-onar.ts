import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { TEX_FIRMA_DESENI, tyKanalDesisi, urunDesisiToplami } from "../src/lib/kargo/ty-nihai-desi";
import { gecmistenKargoDamgasi } from "../src/lib/kanal-kargo-damgasi";
import { apiGet, baslikKur, kimlikOku } from "./ty/istemci";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TRENDYOL EXPRESS — YAPIŞAN GEÇİCİ 5 DESİNİN ONARIMI (kullanıcı 08.10.2026)
 * ----------------------------------------------------------------------------
 *      Kuru:   npx tsx scripts/canli-tex-desi-onar.ts
 *      Yazım:  npx tsx scripts/canli-tex-desi-onar.ts --yaz --anlik="C:\…\oncesi.json"
 *
 *  BETIK SINIFI: TEK_SEFERLIK — kural (`src/lib/kargo/ty-nihai-desi.ts`) bundan
 *  sonrasını doğru yazıyor; bu betik kural düzelmeden önce yapışan değerleri
 *  onarır. Her Trendyol Express siparişi Trendyol API'sinden (yalnız GET) yeniden
 *  okunur ve AYNI kuraldan geçer:
 *    · teslim edilmiş → nihai desi yazılır, tahmin o desiyle tazelenir;
 *    · kargoda       → geçici 5 silinir, tahmin ÜRÜN desisiyle yazılır
 *                       (ürün desisi bilinmiyorsa dokunulmaz, sayılır).
 *  `cargoAmount` (gerçekleşen) dolu siparişe dokunulmaz (tazeleme gövdesinin kapısı).
 *
 *  ⛔ TOPLU YAZIM ÜÇ ŞARTI: (a) `--anlik` zorunlu — dokunulacak alanlar yazımdan
 *  ÖNCE dosyaya; (b) satır satır, tekrar koşulabilir (ölçüt API'den yeniden
 *  hesaplanır, ikinci koşum 0 bulur); (c) her satış eski/yeni değeri `AuditLog`a
 *  yazar (`TEX_DESI_ONARIM` + tazelemenin kendi izi).
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");
const ANLIK = process.argv.find((a) => a.startsWith("--anlik="))?.slice("--anlik=".length) ?? null;

type Plan = {
  id: string; kod: string; channelId: string; kanalAdi: string; firma: string; soldAt: Date;
  eskiKanalDesi: number | null; eskiTahmin: number | null; eskiNet2: number | null;
  durum: "TESLIM" | "KARGODA" | "OKUNAMADI";
  yeniKanalDesi: number | null; tahminDesisi: number | null; tahminKaynagi: "TARTIM" | "URUN_DESISI" | null;
};

async function main() {
  if (YAZ && !ANLIK) throw new Error("--yaz için --anlik=<dosya> zorunlu — hiçbir şey yazılmadı");
  const y = canliYapilandirma();
  if (!y.tamam) throw new Error("canlı yapılandırma okunamadı");
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const k = kimlikOku();
  if (!k) throw new Error("Trendyol kimliği yok");
  const { prisma } = await import("../src/lib/prisma");
  const { kargoTartimGeldiTazele } = await import("../src/lib/kargo-tartim-tazele");
  const { izYaz } = await import("../src/lib/iz");
  try {
    const satislar = await prisma.sale.findMany({
      where: { kanalKargoFirmasi: { contains: "Express" }, iptalTarihi: null, cargoAmount: null },
      select: {
        id: true, code: true, soldAt: true, kanalKargoFirmasi: true, kanalKargoDesi: true, tahminiKargo: true, net2Amount: true,
        channelAccount: { select: { channelId: true, channel: { select: { name: true } } } },
        items: { select: { quantity: true, variant: { select: { product: { select: { desi: true } } } } } },
      },
    });
    const planlar: Plan[] = [];
    for (const s of satislar) {
      if (!s.code || !s.kanalKargoFirmasi || !TEX_FIRMA_DESENI.test(s.kanalKargoFirmasi)) continue;
      const r = (await apiGet(`/integration/order/sellers/${k.saticiId}/orders?orderNumber=${s.code}`, baslikKur(k))) as unknown as Record<string, any>;
      const paketler: any[] = (r.veri ?? r.govde ?? r.data ?? r)?.content ?? [];
      const urunDesi = urunDesisiToplami(
        s.items.map((i) => ({ adet: i.quantity, desi: i.variant.product.desi === null ? null : Number(i.variant.product.desi.toString()) })),
      );
      const temel = {
        id: s.id, kod: s.code, channelId: s.channelAccount.channelId, kanalAdi: s.channelAccount.channel.name, firma: s.kanalKargoFirmasi, soldAt: s.soldAt,
        eskiKanalDesi: s.kanalKargoDesi === null ? null : Number(s.kanalKargoDesi.toString()),
        eskiTahmin: s.tahminiKargo === null ? null : Number(s.tahminiKargo.toString()),
        eskiNet2: s.net2Amount === null ? null : Number(s.net2Amount.toString()),
      };
      if (paketler.length === 0) { planlar.push({ ...temel, durum: "OKUNAMADI", yeniKanalDesi: temel.eskiKanalDesi, tahminDesisi: null, tahminKaynagi: null }); continue; }
      /* Bölünmüş sipariş (ölçüldü %0,01): en geç teslim edilen paketin desisi — içe aktarmayla aynı. */
      let secilen = paketler[0];
      for (const p of paketler) if ((p.cargoDeci ?? 0) > (secilen.cargoDeci ?? 0)) secilen = p;
      const teslim = gecmistenKargoDamgasi(secilen.packageHistories, "Delivered").tur !== "YOK";
      const yeni = tyKanalDesisi({ cargoDeci: secilen.cargoDeci, kargoFirmasi: s.kanalKargoFirmasi, teslimEdildi: teslim });
      planlar.push({
        ...temel,
        durum: teslim ? "TESLIM" : "KARGODA",
        yeniKanalDesi: yeni,
        tahminDesisi: yeni ?? urunDesi,
        tahminKaynagi: yeni !== null ? "TARTIM" : urunDesi !== null ? "URUN_DESISI" : null,
      });
    }

    /* Kargodaki siparişte ürün desisi yoksa HİÇ dokunulmaz: geçici 5 silinip yerine bir şey
       konamaz; teslimde nihai desi gelince içe aktarma kendisi düzeltir. */
    const degisecek = planlar.filter((p) => p.durum !== "OKUNAMADI" && p.tahminKaynagi !== null && (p.yeniKanalDesi !== p.eskiKanalDesi || p.yeniKanalDesi === null));
    const say = (f: (p: Plan) => boolean) => planlar.filter(f).length;
    console.log(`\nTRENDYOL EXPRESS DESİ ONARIMI · ${YAZ ? "⚠ YAZIM" : "KURU KOŞUM"}`);
    console.log(`  incelenen ${planlar.length} · teslim ${say((p) => p.durum === "TESLIM")} · kargoda ${say((p) => p.durum === "KARGODA")} · OKUNAMADI ${say((p) => p.durum === "OKUNAMADI")}`);
    console.log(`  değişecek ${degisecek.length} · ürün desisi bilinmeyen (dokunulmaz) ${say((p) => p.durum === "KARGODA" && p.tahminKaynagi === null)}`);
    const dagilim = new Map<string, number>();
    for (const p of degisecek) { const a = `${p.eskiKanalDesi ?? "—"} → ${p.yeniKanalDesi ?? `ürün ${p.tahminDesisi}`}`; dagilim.set(a, (dagilim.get(a) ?? 0) + 1); }
    for (const [a, n] of [...dagilim].sort((x, y) => y[1] - x[1])) console.log(`    ${a.padEnd(16)} ${n}`);
    for (const p of degisecek.slice(0, 8)) console.log(`    ör. ${p.kod} ${p.durum} desi ${p.eskiKanalDesi} → ${p.yeniKanalDesi ?? `(ürün ${p.tahminDesisi})`} · tahmin ${p.eskiTahmin}`);
    if (!YAZ) { console.log("  KURU KOŞUM — hiçbir şey yazılmadı."); return; }

    writeFileSync(ANLIK!, JSON.stringify(degisecek, null, 1));
    console.log(`  anlık görüntü → ${ANLIK} (${degisecek.length} satış)`);
    let yazilan = 0, tazelenen = 0;
    const tazelenmeyen: string[] = [];
    for (const p of degisecek) {
      if (p.yeniKanalDesi !== p.eskiKanalDesi) await prisma.sale.update({ where: { id: p.id }, data: { kanalKargoDesi: p.yeniKanalDesi } });
      await izYaz({ action: "TEX_DESI_ONARIM", targetType: "Sale", targetId: p.id, userId: null,
        detail: JSON.stringify({ kod: p.kod, durum: p.durum, eskiKanalDesi: p.eskiKanalDesi, yeniKanalDesi: p.yeniKanalDesi, tahminDesisi: p.tahminDesisi, tahminKaynagi: p.tahminKaynagi, eskiTahmin: p.eskiTahmin, eskiNet2: p.eskiNet2 }) });
      yazilan++;
      if (p.tahminDesisi !== null && p.tahminKaynagi !== null) {
        const sonuc = await kargoTartimGeldiTazele({ saleId: p.id, channelId: p.channelId, kanalAdi: p.kanalAdi, kanalKargoFirmasi: p.firma, kanalKargoDesi: p.tahminDesisi, desiKaynagi: p.tahminKaynagi, cargoAmount: null, tahminiKargo: p.eskiTahmin, soldAt: p.soldAt }, prisma);
        if (sonuc.yapildi) tazelenen++; else tazelenmeyen.push(`${p.kod}:${sonuc.neden}`);
      }
    }
    const net = await prisma.sale.aggregate({ where: { id: { in: degisecek.map((p) => p.id) } }, _sum: { net2Amount: true } });
    const eskiNet = degisecek.reduce((t, p) => t + (p.eskiNet2 ?? 0), 0);
    console.log(`  ✓ YAZILAN ${yazilan} · tahmin tazelenen ${tazelenen} · tazelenemeyen ${tazelenmeyen.length} ${tazelenmeyen.slice(0, 5).join(" ")}`);
    console.log(`  NET-2 bu satışlarda: ${eskiNet.toFixed(2)} → ${Number(net._sum.net2Amount ?? 0).toFixed(2)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
