import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  UYDURMA KARGO TARİHİNİ GERİ AL — VARSAYILAN SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:kargo-geri-al            → KURU KOŞUM (hiçbir şey yazmaz)
 *      npm run canli:kargo-geri-al -- --yaz   → yazar
 *
 *  ⚠ VAKA (27.08.2026): `/satislar` → "Kargoya verildi olarak işaretle"
 *  düğmesi `shippedAt = BUGÜN` yazıyor ve liste SAYFALANMIYOR — yani tek tık
 *  ekrandaki her satırı işaretliyor. Görev kutusunda kapatılamayan 5192
 *  maddelik bir yığın vardı (K60) ve o düğme onu kapatmanın tek görünen
 *  yoluydu. Sonuç: içe aktarılmış siparişlere **hiç bilinmeyen** bir kargo
 *  tarihi yazıldı.
 *
 *  ⛔ DOĞRU DEĞER `null`. Uydurma bir tarihi başka bir uydurma tarihle
 *  değiştirmiyoruz: sistem o siparişlerin ne zaman çıktığını GERÇEKTEN
 *  bilmiyor ve `null` tam olarak bunu söyler. K60'ın `BILINMIYOR` kovası
 *  onları görev saymaz ve ekranda ayrıca yazar.
 *
 *  ⚠ ELLE GİRİLENLERE DOKUNULMAZ (`importKaynak IS NULL`). O günlerde
 *  gerçekten kargolanan siparişler yerinde kalır — ölçüt kimliğe bağlı,
 *  tarihe değil.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

/** Toplu tıkların düştüğü iki iş günü (UTC gece yarısı = İstanbul günü). */
const GUNLER = [
  new Date("2026-08-26T00:00:00.000Z"),
  new Date("2026-08-27T00:00:00.000Z"),
];

const gun = (d: Date | null) =>
  d === null ? "—" : new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);

const an = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(d);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(78));
  console.log("UYDURMA KARGO TARİHİ — " + (YAZ ? "⚠ YAZIM KİPİ" : "KURU KOŞUM (salt okuma)"));
  console.log("=".repeat(78));

  /** O iki günde kargo tarihi taşıyan HER satış — kimlik ayrımı sonra. */
  const hepsi = await p.sale.findMany({
    where: { shippedAt: { in: GUNLER } },
    select: {
      id: true, code: true, shippedAt: true, updatedAt: true,
      importKaynak: true, shipmentCode: true, iptalTarihi: true,
    },
  });

  const iceAktarilan = hepsi.filter((s) => s.importKaynak !== null);
  const elle = hepsi.filter((s) => s.importKaynak === null);

  console.log("\n① KAPSAM — o iki günde kargo tarihi taşıyan satışlar");
  console.log("   toplam                     " + String(hepsi.length).padStart(6));
  console.log("   içe aktarılmış (ETKİLENİR) " + String(iceAktarilan.length).padStart(6));
  console.log("   ELLE GİRİLMİŞ (DOKUNULMAZ) " + String(elle.length).padStart(6));

  console.log("\n② KAYNAK KIRILIMI — etkilenecekler");
  const kaynak = new Map<string, Map<string, number>>();
  for (const s of iceAktarilan) {
    const g = gun(s.shippedAt);
    const m = kaynak.get(s.importKaynak!) ?? new Map<string, number>();
    m.set(g, (m.get(g) ?? 0) + 1);
    kaynak.set(s.importKaynak!, m);
  }
  for (const [k, m] of [...kaynak.entries()].sort()) {
    const satir = [...m.entries()].sort().map(([g, n]) => g + ": " + n).join("  ·  ");
    console.log("   " + k.padEnd(16) + String([...m.values()].reduce((a, b) => a + b, 0)).padStart(6) + "   " + satir);
  }

  console.log("\n③ ELLE GİRİLENLER — yerinde kalacaklar");
  const elleGun = new Map<string, number>();
  for (const s of elle) elleGun.set(gun(s.shippedAt), (elleGun.get(gun(s.shippedAt)) ?? 0) + 1);
  if (elleGun.size === 0) console.log("   (yok)");
  for (const [g, n] of [...elleGun.entries()].sort()) console.log("   " + g + "   " + String(n).padStart(5));

  /**
   * ═══ ④ RİSK ÖLÇÜMÜ — VE ÖLÇÜT DEĞİŞTİRİLDİ ═══
   *
   * ⚠ MİMAR TALİMATI SÜZGEÇTEN GEÇTİ. İstenen ölçüt _"shipmentCode dolu
   * olanlar hariç tutulsun"_ idi; NİYETİ doğru (gerçekten kargolananı
   * bozma) ama MEKANİZMASI bu niyeti karşılamıyor:
   *
   *   · TY içe aktarması `shipmentCode`u HER siparişe yazıyor — o alanın
   *     dolu olması "26/27.08'de kargolandı" demek DEĞİL, yalnız "bir
   *     takip numarası var" demek. Ona göre hariç tutmak, 400+ satırda
   *     UYDURMA tarihi korumak olurdu.
   *
   * GERÇEK AYIRT EDİCİ: `updatedAt`. Toplu tık binlerce satırı SANİYELER
   * içinde günceller; tek tek elle işaretlenen bir satır ise zaman içinde
   * dağılır. Yığılma toplu tıkın imzasıdır.
   */
  console.log("\n④ RİSK ÖLÇÜMÜ — bu tarihler nasıl yazıldı");
  console.log("   ⚠ `shipmentCode` ölçüt DEĞİL (gerekçe koda yazılı). Ölçüt: updatedAt yığılması.\n");
  const kovalar = new Map<string, number>();
  for (const s of iceAktarilan) {
    /**
     * ⚠ DAKİKAYA YUVARLA — 17 KARAKTER. `slice(0, 16)` yazılmıştı ve
     * "2026-08-27, 09:5" üretiyordu: dakikanın SON HANESİ kesiliyor, yani
     * kova aslında 10 DAKİKALIK oluyordu. Sayı makul görünüyordu ve tam bu
     * yüzden fark edilmesi zordu — etiket "dakika" diyordu, ölçtüğü başkaydı.
     */
    const dk = an(s.updatedAt).slice(0, 17);
    kovalar.set(dk, (kovalar.get(dk) ?? 0) + 1);
  }
  const sirali = [...kovalar.entries()].sort((a, b) => b[1] - a[1]);
  for (const [dk, n] of sirali.slice(0, 8)) {
    const pay = ((n / iceAktarilan.length) * 100).toFixed(1);
    console.log("     " + dk + "   " + String(n).padStart(6) + " satır   %" + pay);
  }
  if (sirali.length > 8) console.log("     … " + (sirali.length - 8) + " dakika daha");
  const enBuyukIki = sirali.slice(0, 2).reduce((t, x) => t + x[1], 0);
  console.log("\n   en yoğun 2 dakika: " + enBuyukIki + "/" + iceAktarilan.length +
    "  %" + ((enBuyukIki / Math.max(1, iceAktarilan.length)) * 100).toFixed(1) +
    "   ← toplu tık imzası");
  const dagilan = sirali.filter(([, n]) => n < 5);
  console.log("   5'ten az satır taşıyan dakika: " + dagilan.length +
    " (toplam " + dagilan.reduce((t, x) => t + x[1], 0) + " satır)" +
    "   ← elle işaretlenmiş OLABİLİR, aşağıda listeli");
  if (dagilan.length > 0) {
    console.log("\n   ⚠ DAĞINIK SATIRLAR — geri almadan HARİÇ TUTULUYOR:");
    const dagilanDk = new Set(dagilan.map(([dk]) => dk));
    for (const s of iceAktarilan.filter((x) => dagilanDk.has(an(x.updatedAt).slice(0, 17))).slice(0, 20)) {
      console.log("     " + (s.code ?? "(kodsuz)").padEnd(14) + " " + gun(s.shippedAt) +
        "  güncellendi " + an(s.updatedAt) + "  " + s.importKaynak);
    }
  }

  /** ⛔ HARİÇ TUTULANLAR: dağınık güncellenmiş satırlar (elle olabilir). */
  const dagilanDk = new Set(dagilan.map(([dk]) => dk));
  const hedef = iceAktarilan.filter((s) => !dagilanDk.has(an(s.updatedAt).slice(0, 17)));

  console.log("\n⑤ SONUÇ — geri alınacak");
  console.log("   içe aktarılmış, o tarihlerde damgalı   " + String(iceAktarilan.length).padStart(6));
  console.log("   − dağınık güncelleme (hariç)           " + String(iceAktarilan.length - hedef.length).padStart(6));
  console.log("   ────────────────────────────────────────────");
  console.log("   GERİ ALINACAK                          " + String(hedef.length).padStart(6));

  console.log("\n⑥ İPTAL DURUMU (bilgi)");
  console.log("   hedefin iptalli olanı  " + hedef.filter((s) => s.iptalTarihi !== null).length +
    "   (iptalli satışın kargo tarihi zaten hüküm taşımaz, yine de sıfırlanır)");

  console.log("\n⑦ shipmentCode DAĞILIMI (talep edilen ölçüm — ölçüt DEĞİL)");
  const kodlu = hedef.filter((s) => (s.shipmentCode ?? "").trim() !== "").length;
  console.log("   kargo numarası VAR   " + String(kodlu).padStart(6) +
    "   → K60'ta `CIKMIS`: görev sayılmaz, tarihi de iddia edilmez");
  console.log("   kargo numarası YOK   " + String(hedef.length - kodlu).padStart(6) +
    "   → K60'ta `BILINMIYOR`: ekranda ayrıca yazar");

  if (!YAZ) {
    console.log("\n" + "=".repeat(78));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:kargo-geri-al -- --yaz");
    console.log("=".repeat(78) + "\n");
    await p.$disconnect();
    return;
  }

  // ═══ YAZIM ═══════════════════════════════════════════════════════════════
  console.log("\n⚠ YAZILIYOR…");
  const oncesi = await p.sale.count({ where: { shippedAt: { in: GUNLER }, importKaynak: { not: null } } });
  const sonuc = await p.sale.updateMany({
    where: { id: { in: hedef.map((s) => s.id) } },
    data: { shippedAt: null },
  });
  const sonrasi = await p.sale.count({ where: { shippedAt: { in: GUNLER }, importKaynak: { not: null } } });

  /** ⚠ TEK TOPLU İZ — gerekçesiyle. */
  await p.auditLog.create({
    data: {
      action: "KARGO_TARIHI_GERI_ALINDI",
      targetType: "Sale",
      detail: JSON.stringify({
        gerekce:
          "Toplu 'kargoya verildi' düğmesi içe aktarılmış siparişlere BUGÜNÜN tarihini yazdı; " +
          "sistem o siparişlerin gerçek kargo tarihini hiç bilmiyor. Doğru değer null.",
        olcut: "importKaynak IS NOT NULL AND shippedAt IN (2026-08-26, 2026-08-27), updatedAt yığılmasında",
        haricTutulan: "dağınık updatedAt taşıyan satırlar (elle işaretlenmiş olabilir)",
        etkilenen: sonuc.count,
        oncesi,
        sonrasi,
        elleGirilenDokunulmadi: elle.length,
      }),
    },
  });

  console.log("   önce  " + oncesi + "  →  sonra  " + sonrasi + "   (etkilenen " + sonuc.count + ")");
  console.log("   ✓ AuditLog: KARGO_TARIHI_GERI_ALINDI");
  console.log("");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
