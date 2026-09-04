/** BETIK SINIFI: SUREKLI. ⛔ BU SURUM HICBIR SEY YAZMAZ — yazim yolu TANIMLI DEGIL. */
import {
  UCLAR,
  baslikKur,
  kimlikOku,
  tumKayitlar,
} from "./hb/istemci";

/**
 * ============================================================================
 *  HB SİPARİŞ ÇEKİMİ — İSKELET (ÖNİZLEME-YALNIZ) · K160
 * ----------------------------------------------------------------------------
 *  Halil onayı 04.09.2026: "HB sipariş çekim iskeleti — TY iskeletinin
 *  kopyası" için onay verildi.
 *
 *  ⛔ YAZIM YOLU YOK — `--yaz` BAYRAĞI BİLE TANIMLI DEĞİL, BİLEREK.
 *  TY'de alan adları ÖLÇÜLEREK bağlandı (n=564: `commission` 564/564,
 *  tahmin edilen `commissionRate` 0/564 çıktı — tahmin sessizce 564
 *  kaleme null yazacaktı). HB'nin SIT ortamında bugün SİPARİŞ VERİSİ YOK;
 *  alan eşlemesi ölçülemez. Ölçülemeyen eşlemeye yazım kurmak, "kolon
 *  başlığı bir iddiadır" hatasının API tarafında tekrarı olurdu.
 *
 *  BU SÜRÜMÜN İŞİ — bugün ölçülebilenler:
 *    ① sipariş/paket uçlarından TAM sayfalama ile çekim (kaç kayıt var)
 *    ② gelen İLK kaydın üst-düzey ALAN ADLARI (değerler basılmaz)
 *    ③ listing ucunda sayfalama davranışının GERÇEK veriyle kanıtı
 *      (SIT'te ~30 listing var; küçük limit → birden çok tur)
 *
 *  AÇILIŞ ŞARTI (yazım yolu): SIT'te test siparişi doğduğunda alan adları
 *  bu betiğin ② çıktısıyla ÖLÇÜLÜR, eşleme yazılır, `--yaz` yolu TY
 *  disipliniyle (önce sayım · çakışmada atla · importBatch · AuditLog ·
 *  ikinci koşum 0) AYRI pakette açılır.
 *
 *  ⚠ Prisma BİLEREK YOK: bu dosya deftere ULAŞAMAZ (`api:dogrula` bunu
 *  yapısal sayar — prisma istemcisi almayan dosya yazamaz).
 *
 *  KOŞUM: npm run canli:hb-ice-aktar
 * ============================================================================
 */

/** Üst-düzey alan ADLARI — değer basılmaz (sipariş verisi kişisel veri taşır). */
function alanAdlari(kayit: unknown): string[] {
  if (kayit === null || typeof kayit !== "object") return [];
  return Object.keys(kayit as Record<string, unknown>).sort();
}

async function ucuOlc(
  ad: string,
  yolKur: (offset: number, limit: number) => string,
  baslik: Record<string, string>,
  limit: number,
): Promise<void> {
  console.log(`\n── ${ad} ` + "─".repeat(Math.max(1, 70 - ad.length)));
  const s = await tumKayitlar(yolKur, baslik, limit);
  if (s.tur === "HATA") {
    console.log(`   ⛔ OKUNAMADI: ${s.sonuc.tur} — hüküm yok (boş DEĞİL)`);
    return;
  }
  if (s.tur === "ZARF_TANINMADI") {
    console.log(`   ⛔ ZARF TANINMADI — üst-düzey alanlar: ${s.alanlar.join(", ") || "(boş gövde)"}`);
    console.log(`      Dizi bulunamadı; "0 kayıt" İLAN EDİLMİYOR.`);
    return;
  }
  const beyan =
    s.beyanToplam === null
      ? "beyan yok"
      : `beyan totalCount=${s.beyanToplam}${s.kayitlar.length === s.beyanToplam ? " ✓" : " ⚠ SAYIM TUTMUYOR"}`;
  console.log(`   kayıt ${s.kayitlar.length} · tur ${s.turSayisi} (limit ${limit}) · ${beyan}${s.kesildiMi ? " · ⚠ KESİLDİ — liste eksik olabilir" : ""}`);
  if (s.kayitlar.length > 0) {
    console.log(`   ilk kaydın alan adları (değer basılmaz):`);
    console.log(`     ${alanAdlari(s.kayitlar[0]).join(" · ")}`);
    /** `status` adlı alan VARSA dağılımı say — yoksa bunu da söyle. */
    const ilk = s.kayitlar[0] as Record<string, unknown>;
    if ("status" in ilk) {
      const dagilim = new Map<string, number>();
      for (const k of s.kayitlar as Record<string, unknown>[]) {
        const d = String(k.status);
        dagilim.set(d, (dagilim.get(d) ?? 0) + 1);
      }
      for (const [d, n] of dagilim) console.log(`     status=${d}  ${n}`);
    } else {
      console.log(`     ("status" adlı üst-düzey alan yok — durum alanı ölçülünce adıyla eklenir)`);
    }
  }
}

async function main() {
  const k = kimlikOku();
  console.log("\n" + "=".repeat(78));
  console.log("  HB SİPARİŞ ÇEKİMİ — İSKELET (ÖNİZLEME-YALNIZ; yazım yolu TANIMSIZ)");
  console.log("=".repeat(78));
  if (!k) {
    console.log("\n⛔ HEPSIBURADA_MERCHANT_ID / _API_KEY / _DEVELOPER .env.canli'de eksik.\n");
    process.exitCode = 1;
    return;
  }
  console.log(`  ortam: ${k.ortam}`);
  const baslik = baslikKur(k);

  await ucuOlc("① SİPARİŞLER (OMS)", (o, l) => UCLAR.siparisler(k, o, l), baslik, 100);
  await ucuOlc("② PAKETLER (OMS)", (o, l) => UCLAR.paketler(k, o, l), baslik, 100);
  /** ⚠ limit KÜÇÜK BİLEREK: ~30 kayıtlık SIT listing'i birden çok tura
   *  bölünsün ki offset ilerletmenin ÇALIŞTIĞI gerçek veriyle görülsün. */
  await ucuOlc("③ LİSTİNGLER (sayfalama kanıtı)", (o, l) => UCLAR.listingler(k, o, l), baslik, 10);

  console.log("\n" + "=".repeat(78));
  console.log("  ⛔ YAZIM YOLU YOK. Test siparişi doğunca alan eşlemesi ①/②'nin");
  console.log("     çıktısıyla ölçülür; yazım TY disipliniyle ayrı pakette açılır.");
  console.log("=".repeat(78) + "\n");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
