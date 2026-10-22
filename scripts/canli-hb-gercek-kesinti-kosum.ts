/**
 * ============================================================================
 *  K325-⑦ — HB GERÇEK KESİNTİ: GEÇMİŞ SATIŞLARIN KURU KOŞUMU (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  Hakediş satırlarındaki gerçek stopaj · ödeme gideri · hizmet bedeli ile
 *  kayıtlı kâr dökümü uyuşmayan HB satışlarını bulur ve her biri için yazımla
 *  AYNI gövdeyle (`satisKarTazeleOnizle`) yeni NET-2'yi hesaplar. HİÇBİR ŞEY
 *  YAZMAZ. Yazım kullanıcı onayından sonra, anlık görüntüyle ayrıca kurulur.
 *
 *  Çıktı: aday sayısı (40 gün içi = günlük çekimin zaten tazeleyeceği ·
 *  daha eski = onay bekleyen), kod başına dağılım, NET-2 önce/sonra toplamı,
 *  en büyük 10 değişim, hesaplanamayan.
 *
 *      npm run canli:hb-gercek-kesinti
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";

const para = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)) });
  const { hbGercekKesintiAdaylari } = await import("../src/lib/hakedis/gercek-kesinti-tazele");
  const { satisKarTazeleOnizle } = await import("../src/lib/kar-yeniden");

  try {
    const simdi = new Date();
    console.log(`\nK325-⑦ KURU KOŞUM — hedef ${y.veri.adres.hostname} · okuma anı ${simdi.toISOString()} (YAZMAZ)\n`);
    const adaylar = await hbGercekKesintiAdaylari(prisma, { simdi, sonGun: null });
    const yakin = new Set((await hbGercekKesintiAdaylari(prisma, { simdi, sonGun: 40 })).map((a) => a.saleId));

    const kodSayisi = new Map<string, number>();
    for (const a of adaylar) for (const k of a.farkliKodlar) kodSayisi.set(k, (kodSayisi.get(k) ?? 0) + 1);

    let onceToplam = 0, sonraToplam = 0, hesapDisi = 0, hata = 0;
    let yakinFark = 0, eskiFark = 0;
    const degisimler: { kod: string; once: number; sonra: number }[] = [];
    for (const a of adaylar) {
      try {
        const o = await satisKarTazeleOnizle(a.saleId, prisma);
        if (!o || o.onceki.net2 === null || o.yeni.durum !== "CALCULATED") { hesapDisi++; continue; }
        onceToplam += o.onceki.net2;
        sonraToplam += o.yeni.net2;
        const fark = o.yeni.net2 - o.onceki.net2;
        if (yakin.has(a.saleId)) yakinFark += fark; else eskiFark += fark;
        degisimler.push({ kod: a.code ?? a.saleId, once: o.onceki.net2, sonra: o.yeni.net2 });
      } catch (e) {
        hata++;
        console.log(`⛔ ${a.code ?? a.saleId} — ${parolayiTemizle(String((e as Error).message ?? e), y.veri.parola).replace(/\s+/g, " ")}`);
      }
    }

    console.log(`Aday satış (kayıtlı döküm ≠ hakedişteki gerçek): ${adaylar.length}`);
    console.log(`  · sipariş satırı son 40 günde (günlük çekim zaten tazeler) : ${yakin.size}`);
    console.log(`  · daha eski (ONAY bekler)                                   : ${adaylar.length - yakin.size}`);
    console.log("Uyuşmayan kod dağılımı:");
    for (const [k, n] of kodSayisi) console.log(`  ${k.padEnd(14)} ${n}`);
    console.log(`\nNET-2 hesaplanan ${degisimler.length} satışta:`);
    console.log(`  önce  ${para(onceToplam)}`);
    console.log(`  sonra ${para(sonraToplam)}`);
    console.log(`  fark  ${para(sonraToplam - onceToplam)}  (40 gün içi ${para(yakinFark)} · eski ${para(eskiFark)})`);
    console.log(`Hesaplanamayan/NET'i olmayan (NO_COST vb., fark toplamına girmedi): ${hesapDisi} · hata: ${hata}`);
    console.log("\nEn büyük 10 değişim (NET-2):");
    for (const d of degisimler.sort((p, q) => Math.abs(q.sonra - q.once) - Math.abs(p.sonra - p.once)).slice(0, 10)) {
      console.log(`  ${d.kod.padEnd(14)} ${para(d.once).padStart(12)} → ${para(d.sonra).padStart(12)}  (${para(d.sonra - d.once)})`);
    }
    console.log("\nKURU KOŞUM — hiçbir şey yazılmadı.\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.log("HATA", String((e as Error).message ?? e));
  process.exitCode = 1;
});
