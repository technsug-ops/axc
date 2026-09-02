/**
 * ============================================================================
 *  TERS SATIR LİSTESİNİN OLAY UFKU — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:liste-ufku
 *
 *  BETIK SINIFI: TEK_SEFERLIK — kesim tarihi kararı için. HİÇBİR ŞEY YAZMAZ.
 *
 *  ── ⛔ NİYE ÖNCE BU ÖLÇÜLÜYOR ───────────────────────────────────────────
 *  Kullanıcı önerdi: _"bir tarihe kadar manuel, sonrasını API'den takip
 *  etsek olmaz mı — eski hesaplar manuel iken tutarlıydı."_ Fikir sağlam ve
 *  anayasada emsali var (tarife boşluğu: "görüş alanının başlangıcı").
 *
 *  ⚠ AMA KESİM TARİHİ SEÇİLMEDEN ÖNCE ŞU SORULMALI: iade açığının son 30
 *  günde SIFIR olması, iadenin BİTTİĞİ anlamına mı geliyor — yoksa
 *  KULLANICININ LİSTESİ orada mı bitiyor?
 *
 *  ⛔ İKİSİ AYNI GÖRÜNÜR VE TAMAMEN FARKLI ŞEYLERDİR:
 *    · iade gerçekten durduysa → kesim BUGÜN olabilir
 *    · liste orada bittiyse → "sıfır" bir ÖLÇÜM DEĞİL, KAPSAM SINIRIDIR
 *      ve o tarihten sonrası HİÇ ÖLÇÜLMEMİŞ demektir
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir"; "yeni izin doğum tarihi beyan edilir".)_
 * ============================================================================
 */

import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

import { paketiNormalle } from "../src/lib/tablo/paket";

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";

function tarihCoz(x: unknown): Date | null {
  if (x instanceof Date) return Number.isNaN(x.getTime()) ? null : x;
  return null;
}
function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const sayfa = (
    await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt)
  )[0] as unknown as { data: unknown[][] };
  const veri = sayfa.data;
  const baslik = (veri[0] ?? []).map((c) => String(c ?? "").trim());

  console.log("=".repeat(74));
  console.log("  TERS SATIR LİSTESİ — OLAY UFKU (salt okuma)");
  console.log("=".repeat(74));
  console.log(`\n  satır (başlık hariç): ${veri.length - 1}`);
  console.log(`  sütunlar: ${baslik.filter((b) => b !== "").join(" · ")}`);

  /** Tarih taşıyan HER sütun ayrı ölçülüyor — hangisi "olay anı" belirsiz. */
  for (const [i, ad] of baslik.entries()) {
    if (ad === "") continue;
    const tarihler = veri
      .slice(1)
      .map((r) => tarihCoz(r[i]))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    if (tarihler.length === 0) continue;
    const aylar = new Map<string, number>();
    for (const d of tarihler) {
      const k = gun(d).slice(0, 7);
      aylar.set(k, (aylar.get(k) ?? 0) + 1);
    }
    const sonUcAy = [...aylar.entries()].sort().slice(-4);
    console.log(`\n  ── sütun: ${ad}`);
    console.log(
      `     dolu ${tarihler.length}/${veri.length - 1}` +
        `  ·  EN ESKİ ${gun(tarihler[0])}` +
        `  ·  ⭐ EN YENİ ${gun(tarihler[tarihler.length - 1])}`,
    );
    console.log(
      "     son aylar: " +
        sonUcAy.map(([k, v]) => `${k}=${v}`).join(" · "),
    );
  }

  /**
   * ⭐ ÇAPRAZ KONTROL — LİSTENİN KENDİ `PAZAR YERI` SÜTUNU.
   *
   * Kanal dağılımını 02.09'da SİSTEMİN satış kaydından ölçtüm
   * (HB %52,2 · TY %47,8). Listenin kendi etiketi BAĞIMSIZ bir kaynak:
   * tutuyorsa ölçüm doğrulanır, tutmuyorsa hangisinin yanıldığı sorulur.
   * _(Anayasa: "dış kaynağın kendi etiketiyle karşılaştır — iç tutarlılık
   * kaymayı gizler".)_
   */
  const iPazar = baslik.indexOf("PAZAR YERI");
  const iTur = baslik.indexOf("TÜR");
  if (iPazar >= 0) {
    console.log("");
    console.log("  ── LİSTENİN KENDİ 'PAZAR YERI' ETİKETİ");
    const g = new Map<string, number>();
    for (const r of veri.slice(1)) {
      const k = String(r[iPazar] ?? "").trim() || "(boş)";
      g.set(k, (g.get(k) ?? 0) + 1);
    }
    for (const [k, v] of [...g.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`     ${k.padEnd(18)} ${String(v).padStart(5)} satır`);
    }
    if (iTur >= 0) {
      console.log("");
      console.log("  ── PAZAR YERI × TÜR");
      const gg = new Map<string, number>();
      for (const r of veri.slice(1)) {
        const k =
          (String(r[iPazar] ?? "").trim() || "(boş)") +
          " / " +
          (String(r[iTur] ?? "").trim() || "(boş)");
        gg.set(k, (gg.get(k) ?? 0) + 1);
      }
      for (const [k, v] of [...gg.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`     ${k.padEnd(28)} ${String(v).padStart(5)}`);
      }
    }
  }

  /**
   * ⭐ SİSTEMDEKİ İADE KAYITLARI — KESİM TARİHİNİN ÖTEKİ YAKASI.
   *
   * Kullanıcı 02.09.2026: _"Selliora'ya girdim, iadeleri Ağustos'tan
   * sonra orada görebilirsin."_ Yani manuel liste ile sistem kaydı
   * **ardışık** olmalı: liste bir tarihte biter, sistem oradan devam eder.
   *
   * ⛔ ÖLÇÜLMESİ GEREKEN ŞEY ÖRTÜŞME VE BOŞLUK:
   *   · liste bitiyor ↔ sistem başlıyor arası BOŞLUK varsa → o pencere
   *     hiçbir yerde kayıtlı değil ve kesim tarihi oraya konamaz
   *   · ÖRTÜŞME varsa → aynı iade iki kez sayılıyor olabilir
   * Hiçbiri varsayılmıyor; ikisi de sayılıyor.
   */
  const y = canliYapilandirma();
  if (y.tamam) {
    const prisma = new PrismaClient({
      adapter: new PrismaMariaDb(y.veri.ham),
    });
    const iadeler = await prisma.return.findMany({
      select: { occurredAt: true, createdAt: true },
    });
    const bildirimler = await prisma.returnNotice.findMany({
      select: { noticedAt: true },
    });
    console.log("");
    console.log("  ── SİSTEMDEKİ İADE KAYITLARI (kesimin öteki yakası)");
    console.log(`     Return       : ${iadeler.length}`);
    console.log(`     ReturnNotice : ${bildirimler.length}`);

    const aylik = (
      ad: string,
      tarihler: Date[],
    ) => {
      if (tarihler.length === 0) {
        console.log(`     ${ad}: KAYIT YOK`);
        return;
      }
      const s = [...tarihler].sort((a, b) => a.getTime() - b.getTime());
      const g = new Map<string, number>();
      for (const d of s) {
        const k = gun(d).slice(0, 7);
        g.set(k, (g.get(k) ?? 0) + 1);
      }
      console.log(
        `     ${ad}: EN ESKİ ${gun(s[0])} · EN YENİ ${gun(s[s.length - 1])}`,
      );
      console.log(
        "        aylar: " +
          [...g.entries()]
            .sort()
            .map(([k, v]) => `${k}=${v}`)
            .join(" · "),
      );
    };
    aylik("Return (iş tarihi)", iadeler.map((x) => x.occurredAt));
    aylik("ReturnNotice", bildirimler.map((x) => x.noticedAt));

    /**
     * ⛔ ÖRTÜŞME KONTROLÜ — KESİM TARİHİNİN ASIL RİSKİ.
     *
     * Liste 2026-08-03'te bitiyor, sistem 2026-07-03'te başlıyor: bir aylık
     * ÖRTÜŞME var. Boşluk olsaydı "ölçülmemiş pencere" olurdu; örtüşmede
     * risk tersine döner — AYNI İADE İKİ KEZ sayılabilir.
     *
     * ⚠ ÖLÇÜT SİPARİŞ NUMARASI, TARİH DEĞİL: aynı gün iki farklı iade
     * olabilir; çakışmayı tarih değil KİMLİK gösterir.
     * _(Anayasa: "kimlik varken dizeyle aranmaz".)_
     */
    const listeNolari = new Set(
      veri
        .slice(1)
        .map((r) => String(r[baslik.indexOf("Sipariş Numarası")] ?? "").trim())
        .filter((x) => x !== ""),
    );
    const sistemIadeleri = await prisma.return.findMany({
      select: { occurredAt: true, sale: { select: { code: true } } },
    });
    const cakisan = sistemIadeleri.filter(
      (x) => x.sale?.code !== null && listeNolari.has(x.sale?.code ?? ""),
    );
    console.log("");
    console.log("  ── ÖRTÜŞME: sistemdeki iade LİSTEDE de var mı");
    console.log(`     sistem Return : ${sistemIadeleri.length}`);
    console.log(`     ⚠ ÇAKIŞAN     : ${cakisan.length}`);
    if (cakisan.length > 0) {
      for (const c of cakisan.slice(0, 10)) {
        console.log(`        ${c.sale?.code} · ${gun(c.occurredAt)}`);
      }
      console.log("     ⛔ ÇİFT SAYIM RİSKİ: bu iadeler hem ters kayıtla");
      console.log("        hem sistem kaydıyla kapatılmış olabilir. Kesim");
      console.log("        tarihi bu kümeyi DIŞARIDA bırakmalı.");
    } else {
      console.log("     ✓ ÇAKIŞMA YOK — liste ile sistem kaydı AYRIK.");
      console.log("        Kesim tarihi güvenle konabilir.");
    }
    await prisma.$disconnect();
  } else {
    console.log("\n  ⚠ Canlı bağlantı yok — sistem tarafı ÖLÇÜLEMEDİ.");
    console.log("    Bu 'kayıt yok' DEMEK DEĞİLDİR.");
  }

  console.log("\n" + "-".repeat(74));
  console.log(
    "  ⛔ HÜKÜM YOK. Bu rapor yalnız LİSTENİN ufkunu söyler.\n" +
      "     Listenin en yeni tarihi ile bugün arasındaki aralık,\n" +
      "     'iade yok' DEĞİL 'ÖLÇÜLMEMİŞ' demektir — kesim tarihi\n" +
      "     kararı bu ayrımı bilmeden verilemez.",
  );
  console.log("=".repeat(74) + "\n");
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
