import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ÇOK ADETLİ SATIŞTA GELİR TABANI — KANALIN KENDİ ÖDEMESİYLE ÇAPRAZ
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — SALT OKUMA, hiçbir şey yazmaz.
 *  BEKCI SINIFI: BAGIMSIZ — canlı veritabanı gerekiyor.
 *      npm run canli:adet-geliri
 *
 *  ── ⛔ NİYE VAR — VAKA İKİ KEZ YAŞANDI ──────────────────────────────────
 *  ① 29.08.2026: TY içe aktarması `price` alanını SATIR TOPLAMI sanıp adete
 *     BÖLÜYORDU. Çok adetli her satış cironun YARISIYLA girdi ve ZARARDA
 *     göründü. Tek adetli 553 kalemde doğru göründüğü için aylarca kaçtı —
 *     hata kendini en az görünür kılan kümede yaşıyordu.
 *  ② 07.09.2026: `11419703466` için yeniden _"gelir yarım"_ alarmı doğdu.
 *     Bu kez defter DOĞRUYDU; yanlış olan bir ARAÇ ÇIKTISININ etiketiydi
 *     (`fiyat 1.139,00` — birim mi toplam mı belirsiz).
 *
 *  ⭐ Halil (07.09): _"Bu siparişte 2 ürün satılmış toplam 2278 TL… daha önce
 *  de olmuştu, dikkat et."_ İki kez tekrarlayan bir desen artık dikkatle
 *  değil ÖLÇÜMLE karşılanır.
 *
 *  ── AYIRT EDİCİ KAYNAK: KANALIN KENDİ HAKEDİŞİ ──────────────────────────
 *  Defterin kendi içinde tutarlı olması yetmez: `unitPrice × quantity` her
 *  hâlükârda kendi kendini doğrular. Ayırt edici kanıt DIŞARIDAN gelir —
 *  kanalın ödeme kaydı. `11419703466` bunun örneği: hakediş İKİ SATIR ve
 *  toplamı `2.278 − komisyon`; satır başına `1.139 − %18`. İki satır = iki
 *  adet, ve bu gözlem yalnız TEK okumayla uyumlu.
 *  _(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz" ·
 *  "bağımsızlık KAYNAĞIN ayrılığıyla ölçülür".)_
 *
 *  ── ⚠ ORAN, EŞİTLİK DEĞİL ───────────────────────────────────────────────
 *  Hakediş tutarı komisyon DÜŞÜLMÜŞ gelir; ciroya eşit olmaz, biraz altında
 *  olur. Bu yüzden ölçüt `ciro ÷ Σ SIPARIS` oranıdır. Yarım gelir ~0,5;
 *  katlı gelir ~2,0 verir — ikisi de sağlıklı bandın çok dışında.
 *
 *  ── MUTASYONLA SINANDI (07.09.2026) ─────────────────────────────────────
 *  ① `unitPrice × quantity` çarpanı KALDIRILDI (2029'un gerçek hatasının
 *     birebir taklidi)            → KIRMIZI ✓
 *  ② ciro İKİYE KATLANDI (ters yön)                             → KIRMIZI ✓
 *  ③ `process.exitCode = 1` SİLİNDİ                → tek başına YEŞİL KALDI
 *
 *  ⚠ ③ ÖLÇÜT KUSURU DEĞİL, ERİŞİLEMEYEN DAL: bugün sapan 0 olduğu için o
 *  satır hiç çalışmıyor. ÇİFT MUTASYONLA sınandı (① + ③ birlikte) ve sonuç
 *  şu çıktı: sapma EKRANA BASILDI ama çıkış kodu **0** kaldı. Yani satır
 *  taşıyıcıdır ve silinirse boru hattı (hook, `&&` zinciri) sapmayı görmeden
 *  geçer. _(Anayasa: "ölçüm ile karar arasındaki boru da ölçümün parçasıdır"
 *  · "mutasyon kaçıyorsa önce test verisi sorgulanır".)_
 *
 *  ⛔ HAKEDİŞİ OLMAYAN SATIŞ "TEMİZ" SAYILMAZ. Ekstre kapsamı sınırlı
 *  (ölçüldü 07.09: 2026-05 → 2026-08); dışındaki satış İNCELENEMEYEN diye
 *  ayrı sayılır. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen
 *  denetim, denetim değildir".)_
 * ============================================================================
 */

/** Sağlıklı bant — hakediş komisyon düşülmüş olduğu için 1'in biraz üstü. */
const ALT = 0.8;
const UST = 1.25;

function para(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("CANLI ADRES OKUNAMADI");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const satislar = await p.sale.findMany({
    where: { iptalTarihi: null, items: { some: { quantity: { gt: 1 } } } },
    select: {
      code: true,
      soldAt: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: { select: { quantity: true, unitPriceAmount: true } },
    },
  });

  const kodlar = satislar.map((s) => s.code).filter((x): x is string => x !== null);
  const kalemler = await p.settlementItem.findMany({
    where: { orderNo: { in: kodlar } },
    select: { orderNo: true, code: true, amount: true },
  });
  const hakedis = new Map<string, { tutar: number; satir: number }>();
  for (const k of kalemler) {
    if (k.orderNo === null) continue;
    if (!String(k.code).includes("SIPARIS")) continue;
    const v = hakedis.get(k.orderNo) ?? { tutar: 0, satir: 0 };
    v.tutar += Number(k.amount.toString());
    v.satir += 1;
    hakedis.set(k.orderNo, v);
  }

  let temiz = 0;
  let sapan = 0;
  let incelenemeyen = 0;
  const sapanlar: string[] = [];

  for (const s of satislar) {
    const ciro = s.items.reduce(
      (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
      0,
    );
    const adet = s.items.reduce((t, i) => t + i.quantity, 0);
    const h = s.code === null ? undefined : hakedis.get(s.code);
    if (h === undefined || h.tutar <= 0) {
      incelenemeyen++;
      continue;
    }
    const oran = ciro / h.tutar;
    if (oran > ALT && oran < UST) {
      temiz++;
      continue;
    }
    sapan++;
    /** ⚠ YÖN YAZILIR: yarım mı katlı mı — ikisi farklı hata ve farklı iş. */
    const yon = oran <= ALT ? "GELİR YARIM?" : "GELİR KATLI?";
    sapanlar.push(
      `   ${yon}  ${s.code}  ${s.soldAt.toISOString().slice(0, 10)}` +
        ` · ${s.channelAccount.channel.name}` +
        ` · adet ${adet} · ciro ${para(ciro)} · hakediş ${para(h.tutar)}` +
        ` (${h.satir} satır) · oran ${oran.toFixed(3)}`,
    );
  }

  console.log("\n" + "=".repeat(92));
  console.log("  ÇOK ADETLİ SATIŞTA GELİR TABANI — kanalın hakedişiyle çapraz");
  console.log("=".repeat(92));
  console.log(
    `  çok adetli satış ${satislar.length}  ·  temiz ${temiz}  ·  SAPAN ${sapan}` +
      `  ·  incelenemeyen ${incelenemeyen} (hakediş satırı yok — ekstre kapsamı dışı)`,
  );
  console.log(`  sağlıklı bant: ${ALT} < ciro/hakediş < ${UST}`);

  if (sapan > 0) {
    console.log("");
    for (const x of sapanlar) console.log(x);
    console.log(
      "\n  ⛔ SAPMA VAR — bu bir HÜKÜM değil, bakılacak listedir. Kanalın" +
        "\n     sipariş ekranındaki tutarla karşılaştırın.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "\n  ⭐ SAPMA YOK — incelenebilen her çok adetli satışta gelir TAM." +
        (incelenemeyen > 0
          ? `\n  ⚠ ${incelenemeyen} satış İNCELENEMEDİ ve bu 'temiz' DEMEK DEĞİLDİR.`
          : ""),
    );
  }
  console.log("");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
