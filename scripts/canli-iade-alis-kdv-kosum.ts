import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { GENEL_KDV_ORANI, kdvAyir } from "../src/lib/kar";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İADE NET-2 — ALIŞ KDV'Sİ GERİ ALINMIYORDU · GEÇMİŞ DÜZELTMESİ (02.10.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — tek bir hesap kusurunun geçmişine kilitli
 *  (`iade.ts` `maliyetKdvIptali`, kullanıcı onayı «yap»); genel araç değil.
 *
 *      npx tsx scripts/canli-iade-alis-kdv-kosum.ts            → KURU (yazmaz)
 *      npx tsx scripts/canli-iade-alis-kdv-kosum.ts --uygula   → YAZAR
 *
 *  ⛔ KUSUR: iade, satış KDV'sini ve komisyon KDV'sini geri alıyordu ama
 *  STOĞA DÖNEN malın ALIŞ KDV'sini geri almıyordu → aynı alış KDV'si iki kez
 *  düşülüyordu. Vaka: TY 11629354592 — iade NET-2 +0,06, olması gereken
 *  −384,94. NET-1 ETKİLENMEZ; yalnız `net2Amount` değişir.
 *
 *  ⭐ ÖLÇÜT YENİDEN HESAPLANABİLİR — LİSTE SAKLANMAZ. Her iadenin ödenecek KDV
 *  değişimi, kayıtlı `ReturnFee` satırlarından İKİ formülle yeniden kurulur:
 *      ESKİ = −satış KDV + komisyon KDV + ödeme gideri KDV − kargo KDV + tazminat KDV
 *      YENİ = ESKİ + stoğa dönen malın alış KDV'si (MALIYET_GERI + MALIYET_DONMEYEN)
 *  Kayıtlı (net1 − net2) ESKİ ile kuruşuna tutuyorsa → DÜZELTİLİR;
 *  YENİ ile tutuyorsa → ZATEN DOĞRU (ikinci koşum zararsız);
 *  ikisiyle de tutmuyorsa → İNCELENEMEDİ, yazılmaz, listelenir.
 *  Geri alma da aynı ölçüte bakar (YENİ'yi ESKİ'ye çevirmek) — ayrı bayrak
 *  istenirse eklenir; bugün yazılmadı.
 *
 *  ⚠ SATIR SATIR, TEKRAR KOŞULABİLİR (toplu yazım kuralı b): her iade bağımsız.
 *  ⚠ YEREL ANLIK GÖRÜNTÜ (kural a): `--uygula` önce `raporlar/`a her iadenin
 *  net2 ÖNCESİNİ yazar; yazımdan sonra kayıtlı değerler beklenenle karşılaştırılır.
 *  ⚠ İZ (önceki değer satır bazında): `IADE_ALIS_KDV_DUZELTME` — dağılım + satır
 *  başına [kimlik, önce, sonra]; geri alma bu listeye BAĞLANMAZ.
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");
const KURUS = 0.01;

type Satir = { code: string; amount: number; vat: number };

/** ESKİ ve YENİ formülle ödenecek KDV değişimi — `iade.ts` ile AYNI terimler. */
export function odenecekKdvIkiFormul(satirlar: Satir[], tazminatVat: number): { eski: number; yeni: number; alisKdv: number } {
  let eski = 0;
  let alisKdv = 0;
  for (const s of satirlar) {
    if (s.code === "KAYIP_GELIR") eski -= kdvAyir(-s.amount, s.vat);
    else if (s.code === "KOMISYON_IADE" || s.code === "ODEME_GIDERI_IADE") eski += kdvAyir(s.amount, GENEL_KDV_ORANI);
    else if (s.code === "IADE_KARGO" || s.code === "YENIDEN_GONDERIM_KARGO") eski -= kdvAyir(-s.amount, GENEL_KDV_ORANI);
    else if (s.code === "TAZMINAT_TAHSILATI") eski += kdvAyir(s.amount, tazminatVat);
    else if (s.code === "MALIYET_GERI" || s.code === "MALIYET_DONMEYEN") alisKdv += kdvAyir(s.amount, s.vat);
  }
  return { eski, yeni: eski + alisKdv, alisKdv };
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("Canlı yapılandırma okunamadı:", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { izYaz } = await import("../src/lib/iz");

  console.log("\nİADE NET-2 — ALIŞ KDV'Sİ GEÇMİŞ DÜZELTMESİ");
  console.log(`  kip  ${UYGULA ? "⚠ YAZIM" : "KURU — hiçbir şey yazılmaz"}`);
  console.log("=".repeat(72));

  const iadeler = await prisma.return.findMany({
    where: { geriAlindiAt: null, profitStatus: "CALCULATED" },
    select: {
      id: true, occurredAt: true, net1Amount: true, net2Amount: true,
      sale: { select: { code: true, items: { select: { vatRate: true }, take: 1 } } },
      fees: { select: { code: true, amount: true, returnItem: { select: { saleItem: { select: { vatRate: true } } } } } },
    },
  });

  type Sonuc = { id: string; kod: string; ay: string; once: number; sonra: number; fark: number };
  const duzelt: Sonuc[] = [];
  const zatenDogru: string[] = [];
  const incelenemedi: { kod: string; sebep: string }[] = [];
  const netsiz: string[] = [];

  for (const r of iadeler) {
    const kod = r.sale.code ?? r.id;
    if (r.net1Amount === null || r.net2Amount === null) { netsiz.push(kod); continue; }
    const ilkVat = Number(r.sale.items[0]?.vatRate ?? 20);
    const satirlar: Satir[] = r.fees.map((f) => ({
      code: f.code,
      amount: Number(f.amount),
      vat: f.returnItem?.saleItem.vatRate ? Number(f.returnItem.saleItem.vatRate) : ilkVat,
    }));
    const { eski, yeni, alisKdv } = odenecekKdvIkiFormul(satirlar, ilkVat);
    const net1 = Number(r.net1Amount);
    const net2 = Number(r.net2Amount);
    const kayitli = net1 - net2;
    if (Math.abs(kayitli - yeni) < KURUS) { zatenDogru.push(kod); continue; }
    if (Math.abs(kayitli - eski) < KURUS) {
      if (alisKdv === 0) { zatenDogru.push(kod); continue; }
      duzelt.push({ id: r.id, kod, ay: r.occurredAt.toISOString().slice(0, 7), once: net2, sonra: net1 - yeni, fark: -alisKdv });
      continue;
    }
    incelenemedi.push({ kod, sebep: `kayıtlı ödenecek ${kayitli.toFixed(2)} · eski ${eski.toFixed(2)} · yeni ${yeni.toFixed(2)}` });
  }

  const toplam = duzelt.reduce((t, d) => t + d.fark, 0);
  console.log(`  incelenen        ${iadeler.length}`);
  console.log(`  DÜZELTİLECEK     ${duzelt.length}   · NET-2 toplam değişim ₺${toplam.toFixed(2)}`);
  console.log(`  zaten doğru      ${zatenDogru.length}   (yeni formülle tutuyor ya da stoğa dönen mal yok)`);
  console.log(`  İNCELENEMEDİ     ${incelenemedi.length}   (iki formülle de tutmuyor — YAZILMAZ)`);
  console.log(`  NET'i boş        ${netsiz.length}`);
  for (const x of incelenemedi) console.log(`     ⚠ ${x.kod}  ${x.sebep}`);
  const ay: Record<string, number> = {};
  for (const d of duzelt) ay[d.ay] = (ay[d.ay] ?? 0) + d.fark;
  console.log("\n  ay ay NET-2 değişimi:");
  for (const [a, v] of Object.entries(ay).sort()) console.log(`     ${a}  ₺${v.toFixed(2)}`);
  const ornek = duzelt.find((d) => d.kod === "11629354592");
  console.log("\n  ÖLÇÜLEN VAKA 11629354592:", ornek ? `önce ${ornek.once.toFixed(2)} → sonra ${ornek.sonra.toFixed(2)} (beklenen −384,94)` : "listede YOK");
  console.log("  en büyük 5 değişim:");
  for (const d of [...duzelt].sort((a, b) => a.fark - b.fark).slice(0, 5)) console.log(`     ${d.kod}  ${d.once.toFixed(2)} → ${d.sonra.toFixed(2)}  (${d.fark.toFixed(2)})`);

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: --uygula");
    await prisma.$disconnect();
    return;
  }

  /* ── (a) yerel anlık görüntü ── */
  const damga = new Date().toISOString().replace(/[:.]/g, "-");
  const dosya = `raporlar/iade-alis-kdv-once-${damga}.json`;
  writeFileSync(dosya, JSON.stringify(duzelt.map((d) => ({ id: d.id, kod: d.kod, net2Once: d.once })), null, 1));
  console.log(`\n  anlık görüntü: ${dosya} (${duzelt.length} satır)`);

  /* ── (b) satır satır; her satır yazmadan ÖNCE ölçütü yeniden sınar ── */
  let yazilan = 0;
  for (const d of duzelt) {
    const g = await prisma.return.updateMany({
      where: { id: d.id, net2Amount: String(d.once) as never },
      data: { net2Amount: String(Number(d.sonra.toFixed(4))) },
    });
    yazilan += g.count;
  }

  /* ── kanıt: kayıtlı değerler beklenenle karşılaştırılır ── */
  const sonra = await prisma.return.findMany({ where: { id: { in: duzelt.map((d) => d.id) } }, select: { id: true, net2Amount: true } });
  const harita = new Map(sonra.map((s) => [s.id, Number(s.net2Amount)]));
  const sapan = duzelt.filter((d) => Math.abs((harita.get(d.id) ?? NaN) - d.sonra) >= KURUS);
  console.log(`  yazılan ${yazilan}/${duzelt.length} · beklenenden sapan ${sapan.length}`);

  await izYaz({
    action: "IADE_ALIS_KDV_DUZELTME",
    targetType: "Return",
    targetId: null as never,
    detail: JSON.stringify({
      not: "Iade NET-2: stoga donen malin alis KDV'si geri alinmiyordu (iade.ts maliyetKdvIptali). NET-1 degismedi.",
      incelenen: iadeler.length, duzeltilen: yazilan, zatenDogru: zatenDogru.length, incelenemedi: incelenemedi.length,
      net2Degisim: Number(toplam.toFixed(2)), ayAy: ay, anlikGoruntu: dosya,
      satirlar: duzelt.map((d) => [d.id.slice(-8), Number(d.once.toFixed(2)), Number(d.sonra.toFixed(2))]),
    }),
  });
  if (sapan.length || yazilan !== duzelt.length) process.exitCode = 1;
  await prisma.$disconnect();
}

main().catch((e) => { console.log("HATA", String(e)); process.exitCode = 1; });
