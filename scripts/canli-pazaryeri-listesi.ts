/**
 * ============================================================================
 *  PAZARYERİ ERİŞİMİ AÇILDI — NE İNDİRİLECEK? (salt okuma)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 24.08.2026: _"pazar yerlerine ulaşabiliyorum"_ → panoda erişim
 *  yokluğuna bağlanmış kalemler açıldı. Bu betik "ne indirilsin" listesini
 *  TAHMİNLE değil ÖLÇÜMLE kurar: hangi kanalda hangi tarih aralığında
 *  satışımız var, kaçının hakedişi bağsız, tarife penceresi nereyi kapsıyor.
 *
 *  ⚠ HİÇBİR ŞEY YAZMAZ.
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

function gun(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log(`\nPAZARYERİ İNDİRME LİSTESİ — hedef ${y.veri.adres.hostname}\n`);

  // ── 1) KANAL BAŞINA SATIŞ UFKU ────────────────────────────────────────
  const satislar = await prisma.sale.findMany({
    where: { iptalTarihi: null },
    select: {
      code: true,
      soldAt: true,
      channelAccount: { select: { name: true, channel: { select: { name: true } } } },
    },
    orderBy: { soldAt: "asc" },
  });

  const kanalUfku = new Map<string, { ilk: Date; son: Date; adet: number }>();
  for (const s of satislar) {
    const k = s.channelAccount?.channel.name ?? "(kanalsız)";
    const v = kanalUfku.get(k);
    if (!v) kanalUfku.set(k, { ilk: s.soldAt, son: s.soldAt, adet: 1 });
    else {
      if (s.soldAt < v.ilk) v.ilk = s.soldAt;
      if (s.soldAt > v.son) v.son = s.soldAt;
      v.adet += 1;
    }
  }
  console.log("① SATIŞ UFKU — ödeme dosyası hangi ayları kapsamalı");
  for (const [k, v] of [...kanalUfku].sort((a, b) => b[1].adet - a[1].adet)) {
    console.log(`   ${k.padEnd(16)} ${String(v.adet).padStart(4)} satış · ${gun(v.ilk)} → ${gun(v.son)}`);
  }

  // ── 2) HAKEDİŞ BAĞI ───────────────────────────────────────────────────
  const [kalemToplam, bagli] = await Promise.all([
    prisma.settlementItem.count(),
    prisma.settlementItem.count({ where: { saleId: { not: null } } }),
  ]);
  console.log(`\n② HAKEDİŞ KALEMİ  toplam ${kalemToplam} · satışa bağlı ${bagli} · BAĞSIZ ${kalemToplam - bagli}`);

  const partiler = await prisma.settlement.findMany({
    select: {
      id: true,
      createdAt: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  for (const p of partiler) {
    console.log(
      `   parti ${gun(p.createdAt)} · ${(p.channelAccount?.channel.name ?? "?").padEnd(14)} ${p._count.items} kalem`,
    );
  }

  // ── 3) TARİFE PENCERESİ ───────────────────────────────────────────────
  const pencereler = await prisma.komisyonTarifesi.findMany({
    select: {
      id: true,
      pencereBaslangic: true,
      pencereBitis: true,
      kaynakDosyaAdi: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      _count: { select: { kalemler: true } },
    },
    orderBy: { pencereBaslangic: "asc" },
  });
  console.log(`\n③ YÜKLÜ TARİFE PENCERESİ: ${pencereler.length}`);
  for (const p of pencereler) {
    console.log(
      `   ${gun(p.pencereBaslangic)} → ${gun(p.pencereBitis)} · ${(p.channelAccount?.channel.name ?? "?").padEnd(14)} ${String(p._count.kalemler).padStart(5)} kalem · ${p.kaynakDosyaAdi ?? "(dosya adı yok)"}`,
    );
  }

  /**
   * ⚠ KAPSAM: kaç satış BİR pencerenin içine düşüyor? Kapsamayan satışta
   * komisyon denetimi HÜKÜM VEREMEZ (anayasa: kapsayan pencere yoksa susulur).
   */
  if (pencereler.length > 0) {
    /**
     * ⚠ KAPSAM "EN ERKENDEN SONRA" DEĞİL, GERÇEK PENCERENİN İÇİ. Yalnız
     * başlangıca bakmak, pencereden SONRA gelen satışı da kapsanmış sayardı;
     * oysa tarife her Salı/Cuma değişiyor ve sonrası bilinmiyor.
     */
    const kapsanan = satislar.filter((s) =>
      pencereler.some(
        (p) => s.soldAt >= p.pencereBaslangic && s.soldAt <= p.pencereBitis,
      ),
    ).length;
    console.log(
      `   → ${kapsanan}/${satislar.length} satış BİR pencerenin içinde · ${satislar.length - kapsanan} satış KAPSAM DIŞI (hüküm verilemez)`,
    );
  }

  // ── 4) EKSİK SİPARİŞ (A3'ün dayanağı) ─────────────────────────────────
  const agustos = satislar.filter((s) => s.soldAt >= new Date("2026-08-01"));
  console.log(`\n④ AĞUSTOS SATIŞI (sistemde): ${agustos.length}`);
  const agustosKanal = new Map<string, number>();
  for (const s of agustos) {
    const k = s.channelAccount?.channel.name ?? "(kanalsız)";
    agustosKanal.set(k, (agustosKanal.get(k) ?? 0) + 1);
  }
  for (const [k, n] of [...agustosKanal].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k.padEnd(16)} ${n}`);
  }
}

main();
