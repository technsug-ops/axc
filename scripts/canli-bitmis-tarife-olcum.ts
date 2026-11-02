import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  BİTMİŞ TARİFE PENCERESİ — KAPSAM ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — bir kuralın yönünü ölçer, rutin koşmaz.
 *
 *  ⛔ NİYE: K368'de «süresi dolmuş dilimler oran kaynağı olmasın» kuralı
 *  yazılacak. Anayasa: bir sınırın YÖNÜ ölçülmeden çevrilmez — «bu kural
 *  bugünkü defterin ne kadarını dışarıda bırakır?» sorusu cevaplanmadan
 *  kural koda girmez.
 *
 *  İki şey ölçülür:
 *  ① Kanal başına tarife tazeliği — bugünü kapsayan pencere var mı.
 *  ② Etkilenen varyant sayısı: yalnız BİTMİŞ pencerede kalemi olanlar, ve
 *     o kalemlerin en düşük oranı kanalın beyan ettiği orandan düşük mü
 *     (yani komisyon olduğundan AZ, kâr olduğundan YÜKSEK görünür mü).
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const an = new Date();
  console.log("\nBİTMİŞ TARİFE PENCERESİ — KAPSAM ÖLÇÜMÜ");
  console.log("  kip  SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  an  ", an.toISOString());
  console.log("=".repeat(78));

  const hesaplar = await prisma.channelAccount.findMany({
    where: { satisIcin: true, isActive: true },
    select: { id: true, name: true, channel: { select: { name: true } } },
  });

  for (const h of hesaplar) {
    const pencereler = await prisma.komisyonTarifesi.findMany({
      where: { channelAccountId: h.id },
      orderBy: { pencereBaslangic: "desc" },
      select: {
        id: true,
        pencereBaslangic: true,
        pencereBitis: true,
        yuklendiAt: true,
        _count: { select: { kalemler: true } },
      },
    });
    const kapsayan = pencereler.filter(
      (p) => p.pencereBaslangic <= an && an <= p.pencereBitis,
    );
    console.log(`\n▸ ${h.channel.name} · ${h.name}`);
    console.log(`   pencere ${pencereler.length} · bugünü KAPSAYAN ${kapsayan.length}`);
    for (const p of pencereler.slice(0, 4)) {
      const bitti = p.pencereBitis < an;
      console.log(
        `     ${p.pencereBaslangic.toISOString().slice(0, 10)} → ${p.pencereBitis.toISOString().slice(0, 10)} · kalem ${p._count.kalemler} · ${bitti ? "BİTTİ" : "açık"}`,
      );
    }

    /** Kalem başına kendi tarihi var mı (28.10 sonrası yüklemeler taşır). */
    const kendiTarihli = await prisma.komisyonTarifeKalemi.count({
      where: { tarife: { channelAccountId: h.id }, gecerlilikBaslangic: { not: null } },
    });
    const toplamKalem = await prisma.komisyonTarifeKalemi.count({
      where: { tarife: { channelAccountId: h.id } },
    });
    console.log(`   kalem ${toplamKalem} · kendi tarihi OLAN ${kendiTarihli} (${toplamKalem === 0 ? 0 : Math.round((kendiTarihli / toplamKalem) * 1000) / 10}%)`);

    /** Bu hesapta satılan varyantlar ve kanalın beyan ettiği oran. */
    const kodlar = await prisma.channelSku.findMany({
      where: { channelAccountId: h.id, isActive: true, variant: { isActive: true } },
      select: { variantId: true, commissionRate: true },
    });
    const beyan = new Map(kodlar.map((k) => [k.variantId, k.commissionRate === null ? null : Number(k.commissionRate.toString())]));

    /** Varyant → bağlı kalemleri olan pencereler (bağsız satırlar kapsam dışı; onlar katalogdan çözülür). */
    const kalemler = await prisma.komisyonTarifeKalemi.findMany({
      where: { tarife: { channelAccountId: h.id }, variantId: { in: [...beyan.keys()] } },
      select: {
        variantId: true,
        oran: true,
        tarife: { select: { pencereBaslangic: true, pencereBitis: true } },
      },
    });
    const varyantlar = new Map<string, { acik: boolean; bitmisEnDusuk: number | null }>();
    for (const k of kalemler) {
      if (k.variantId === null) continue;
      const kayit = varyantlar.get(k.variantId) ?? { acik: false, bitmisEnDusuk: null };
      const acik = k.tarife.pencereBaslangic <= an && an <= k.tarife.pencereBitis;
      if (acik) kayit.acik = true;
      else {
        const o = Number(k.oran.toString());
        kayit.bitmisEnDusuk = kayit.bitmisEnDusuk === null ? o : Math.min(kayit.bitmisEnDusuk, o);
      }
      varyantlar.set(k.variantId, kayit);
    }
    let yalnizBitmis = 0;
    let dusukGosteren = 0;
    const ornekler: string[] = [];
    for (const [vid, k] of varyantlar) {
      if (k.acik || k.bitmisEnDusuk === null) continue;
      yalnizBitmis++;
      const b = beyan.get(vid) ?? null;
      if (b !== null && k.bitmisEnDusuk < b) {
        dusukGosteren++;
        if (ornekler.length < 5) ornekler.push(`${vid} bitmiş en düşük %${k.bitmisEnDusuk} ↔ beyan %${b}`);
      }
    }
    console.log(`   bağlı kalemi olan varyant ${varyantlar.size} · YALNIZ bitmiş pencerede ${yalnizBitmis}`);
    console.log(`   ⚠ bitmiş dilimi kanalın beyanından DÜŞÜK olan: ${dusukGosteren}`);
    for (const o of ornekler) console.log(`       ${o}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
