/** BETIK SINIFI: TEK_SEFERLIK — BEKCI — deneme verisini tek işlemde yazar ve işlemi düşürür; canlı stoğa dokunmaz, yalnız yerel veritabanında koşar. */
/**
 * K347 — İş Ortakları çekirdeğinin bekçisi. Yerel veritabanında TEK işlem içinde
 * koşar ve sonunda işlemi bilerek düşürür: hiçbir deneme kaydı kalmaz.
 * Her kapı İKİ yönde sınanır — yapması gerekeni yapıyor mu, yapmaması gerekeni
 * yapmıyor mu (anayasa: "dokunmuyor iddiası da bir davranıştır").
 *
 * ⚠ HATA KODU TAM EŞİTLİKLE SINANIR, DÜZENLİ İFADEYLE DEĞİL (17.10.2026): Prisma hata
 * mesajı, hatayı veren satırın ÇEVRESİNDEKİ KAYNAK KODU da basar. Kapı silinip
 * veritabanı reddettiğinde mesajda `throw new Error("SILINEMEZ_BAGLI")` satırı görünür
 * ve `/SILINEMEZ_BAGLI/` yalancı yeşil verir — mutasyonla yakalandı.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { projeEkle, katilimEkle, katilimGuncelle, katilimSil, projeSil, ortakSil } from "../src/lib/ortaklik/katilim";
import { finansmanBagla, finansmanBagCoz } from "../src/lib/finansman/ortaklik";
import { kapsamKuraliEkle, otomatikKapsamlar, alimKapsaminiDegistir, alimKapsaminiDogrula } from "../src/lib/ortaklik/kapsam";

const KONTROL_SAYISI = 47;

async function main() {
  const adres = new URL(process.env.DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(adres.hostname), "Yalnız yerel veritabanında koşar");
  const geriAl = new Error("ORTAKLIK_TEST_GERI_AL");
  let sayi = 0;
  const ok = () => { sayi++; };
  try {
    await prisma.$transaction(async tx => {
      const gun = new Date("2026-10-17T00:00:00Z"), dun = new Date("2026-10-16T00:00:00Z");
      const p1 = await tx.ortaklikProjesi.create({ data: { ad: "Tek ortak", baslangic: gun } });
      const p5 = await tx.ortaklikProjesi.create({ data: { ad: "Beş ortak", baslangic: gun } });
      assert.equal(p1.baslangic.toISOString().slice(0, 10), "2026-10-17"); ok();
      // Proje TL ile açılır (kullanıcı kararı 17.10.2026); gün kaymaz.
      const tlProje = await projeEkle(tx, { ad: "TL proje", baslangicGunu: "2026-10-17" });
      assert.equal(tlProje.currency, "TRY"); assert.equal(tlProje.baslangic.toISOString().slice(0, 10), "2026-10-17"); ok();
      await tx.ortaklikProjesi.delete({ where: { id: tlProje.id } });

      // --- katılım: 1 ve 5 ortak, aynı kişi iki projede farklı şartla ---
      const ortaklar: { id: string }[] = [];
      for (let i = 0; i < 5; i++) ortaklar.push(await tx.isOrtagi.create({ data: { ad: `Ortak ${i}` } }));
      const secim = { sorumluluk: "Depo", sermaye: true, emek: false, komisyon: false, finansman: false };
      await katilimEkle(tx, { projeId: p1.id, ortakId: ortaklar[0].id, ...secim });
      for (const ortak of ortaklar) await katilimEkle(tx, { projeId: p5.id, ortakId: ortak.id, ...secim, emek: true, komisyon: true });
      assert.equal(await tx.ortaklikKatilimi.count({ where: { projeId: p1.id } }), 1); ok();
      assert.equal(await tx.ortaklikKatilimi.count({ where: { projeId: p5.id } }), 5); ok();
      const iki = await tx.ortaklikKatilimi.findMany({ where: { ortakId: ortaklar[0].id } });
      assert.equal(iki.length, 2); assert.equal(iki.filter(k => k.emek && k.komisyon).length, 1); ok();
      await assert.rejects(() => katilimEkle(tx, { projeId: p1.id, ortakId: ortaklar[0].id, ...secim }), { code: "P2002" }); ok();
      await assert.rejects(() => katilimEkle(tx, { projeId: randomUUID(), ortakId: ortaklar[0].id, ...secim }), { message: "ORTAKLIK_KAYIT_YOK" }); ok();
      await assert.rejects(() => katilimEkle(tx, { projeId: p1.id, ortakId: randomUUID(), ...secim }), { message: "ORTAKLIK_KAYIT_YOK" }); ok();

      // --- finansman bağı: kur · reddet · çöz ---
      const katilim = await tx.ortaklikKatilimi.findUniqueOrThrow({ where: { projeId_ortakId: { projeId: p1.id, ortakId: ortaklar[0].id } } });
      const sermaye = await tx.finansman.create({ data: { tur: "SERMAYE", kaynakAdi: "Test sermaye", birim: "TRY" } });
      await tx.finansmanHareketi.create({ data: { finansmanId: sermaye.id, tur: "GIRIS", vade: gun, gerceklestiAt: gun, anapara: "10000.1234" } });
      await finansmanBagla(tx, katilim.id, sermaye.id);
      const bagli = await tx.finansman.findUniqueOrThrow({ where: { id: sermaye.id }, include: { hareketler: true } });
      assert.equal(bagli.ortaklikKatilimiId, katilim.id); assert.equal(bagli.hareketler.length, 1); assert.equal(bagli.hareketler[0].anapara.toString(), "10000.1234"); ok();
      const digerKatilim = await tx.ortaklikKatilimi.findUniqueOrThrow({ where: { projeId_ortakId: { projeId: p5.id, ortakId: ortaklar[0].id } } });
      await assert.rejects(() => finansmanBagla(tx, digerKatilim.id, sermaye.id), { message: "BAG_ZATEN_VAR" }); ok();
      const eur = await tx.finansman.create({ data: { tur: "SERMAYE", kaynakAdi: "EUR", birim: "EUR" } });
      await assert.rejects(() => finansmanBagla(tx, katilim.id, eur.id), { message: "BAG_BIRIM" }); ok();
      const borc = await tx.finansman.create({ data: { tur: "ORTAK_BORCU", kaynakAdi: "Borç", birim: "TRY" } });
      await assert.rejects(() => finansmanBagla(tx, katilim.id, borc.id), { message: "BAG_KATKI" }); ok();
      await assert.rejects(() => finansmanBagla(tx, randomUUID(), borc.id), { message: "BAG_KAYIT_YOK" }); ok();
      const banka = await tx.finansman.create({ data: { tur: "BANKA_KREDISI", kaynakAdi: "Banka", birim: "TRY" } });
      await assert.rejects(() => finansmanBagla(tx, katilim.id, banka.id), { message: "BAG_KATKI" }); ok();
      // Katkı kapısı İKİ yönde: bağ varken sermaye kaldırılamaz, emek eklenebilir.
      await assert.rejects(() => katilimGuncelle(tx, katilim.id, { ...secim, sermaye: false, emek: true }), { message: "KATKI_BAGLI" }); ok();
      assert.equal((await tx.ortaklikKatilimi.findUniqueOrThrow({ where: { id: katilim.id } })).sermaye, true); ok();
      await katilimGuncelle(tx, katilim.id, { ...secim, emek: true, sorumluluk: "Depo ve sevkiyat" });
      assert.equal((await tx.ortaklikKatilimi.findUniqueOrThrow({ where: { id: katilim.id } })).emek, true); ok();
      // Bağlı katılım ve katılımı olan proje/ortak silinmez.
      await assert.rejects(() => katilimSil(tx, katilim.id), { message: "SILINEMEZ_BAGLI" }); ok();
      await assert.rejects(() => projeSil(tx, p1.id), { message: "SILINEMEZ_BAGLI" }); ok();
      await assert.rejects(() => ortakSil(tx, ortaklar[0].id), { message: "SILINEMEZ_BAGLI" }); ok();
      // Bağı çöz: bağ kalkar, hareket YERİNDE kalır; çözülmüş kaynak yeniden bağlanabilir.
      const eski = await finansmanBagCoz(tx, sermaye.id);
      assert.equal(eski.katilimId, katilim.id); ok();
      const cozulmus = await tx.finansman.findUniqueOrThrow({ where: { id: sermaye.id }, include: { hareketler: true } });
      assert.equal(cozulmus.ortaklikKatilimiId, null); assert.equal(cozulmus.hareketler.length, 1); assert.equal(cozulmus.hareketler[0].anapara.toString(), "10000.1234"); ok();
      await assert.rejects(() => finansmanBagCoz(tx, sermaye.id), { message: "BAG_KAYIT_YOK" }); ok();
      await finansmanBagla(tx, digerKatilim.id, sermaye.id);
      assert.equal((await tx.finansman.findUniqueOrThrow({ where: { id: sermaye.id } })).ortaklikKatilimiId, digerKatilim.id); ok();
      // Bağ çözülünce katılım silinebilir; katılımsız ortak ve boş proje de.
      await katilimSil(tx, katilim.id);
      assert.equal(await tx.ortaklikKatilimi.count({ where: { id: katilim.id } }), 0); ok();
      const bosProje = await tx.ortaklikProjesi.create({ data: { ad: "Boş", baslangic: gun } });
      await projeSil(tx, bosProje.id); ok();
      const bosOrtak = await tx.isOrtagi.create({ data: { ad: "Boş ortak" } });
      await ortakSil(tx, bosOrtak.id); ok();

      // --- alım kapsamı ---
      const [variant, baskaVariant] = await tx.productVariant.findMany({ where: { ortaklikKapsamKurallari: { none: {} } }, select: { id: true }, take: 2 });
      assert.ok(variant && baskaVariant, "deneme için kuralsız iki varyant gerekir");
      const alim = await tx.purchase.create({ data: { code: randomUUID(), purchasedAt: gun, status: "ORDERED" } });
      const kalemVerisi = { purchaseId: alim.id, variantId: variant.id, quantity: 1, unitCostAmount: "10", unitCostCurrency: "TRY" as const };
      const kalem = await tx.purchaseItem.create({ data: kalemVerisi });
      const satirlar = [{ variantId: variant.id, unitCostCurrency: "TRY" }, { variantId: baskaVariant.id, unitCostCurrency: "TRY" }];
      assert.equal((await otomatikKapsamlar(tx, gun, satirlar)).kapsam.size, 0); ok();
      const kural = await kapsamKuraliEkle(tx, p1.id, variant.id);
      await assert.rejects(() => kapsamKuraliEkle(tx, p5.id, variant.id), { code: "P2002" }); ok();
      await assert.rejects(() => kapsamKuraliEkle(tx, randomUUID(), variant.id), { message: "KAPSAM_KAYIT_YOK" }); ok();
      const otomatik = await otomatikKapsamlar(tx, gun, satirlar);
      assert.equal(otomatik.kapsam.get(variant.id), p1.id); ok();
      // Kural YALNIZ kendi varyantına dokunur.
      assert.equal(otomatik.kapsam.has(baskaVariant.id), false); ok();
      assert.equal((await otomatikKapsamlar(tx, dun, satirlar)).kapsam.size, 0); ok();
      // Para birimi tutmazsa: alım DURMAZ, kalem proje dışı kalır ve atlandığı SÖYLENİR.
      const eurSonuc = await otomatikKapsamlar(tx, gun, [{ variantId: variant.id, unitCostCurrency: "EUR" }]);
      assert.equal(eurSonuc.kapsam.size, 0); ok();
      assert.deepEqual(eurSonuc.atlananlar, [{ variantId: variant.id, projeId: p1.id, neden: "BIRIM" }]); ok();
      assert.equal((await tx.purchaseItem.findUniqueOrThrow({ where: { id: kalem.id } })).ortaklikProjesiId, null); ok();
      await alimKapsaminiDegistir(tx, kalem.id, p1.id);
      assert.equal((await tx.purchaseItem.findUniqueOrThrow({ where: { id: kalem.id } })).ortaklikProjesiId, p1.id); ok();
      // Kural kaldırılınca eski damga korunur.
      await tx.ortaklikKapsamKurali.delete({ where: { id: kural.id } });
      assert.equal((await tx.purchaseItem.findUniqueOrThrow({ where: { id: kalem.id } })).ortaklikProjesiId, p1.id); ok();
      // Katılımı ve kuralı kalmamış, YALNIZ alım kalemi bağı olan proje silinmez
      // (örnek veri tek kapıya takılır — öteki iki sayaç sıfır).
      await tx.ortaklikKatilimi.deleteMany({ where: { projeId: p1.id } });
      await assert.rejects(() => projeSil(tx, p1.id), { message: "SILINEMEZ_BAGLI" }); ok();
      await tx.purchase.update({ where: { id: alim.id }, data: { purchasedAt: dun } });
      await assert.rejects(() => alimKapsaminiDogrula(tx, alim.id), { message: "KAPSAM_ESKI_STOK" }); ok();
      const eskiKalem = await tx.purchaseItem.create({ data: kalemVerisi });
      await assert.rejects(() => alimKapsaminiDegistir(tx, eskiKalem.id, p1.id), { message: "KAPSAM_ESKI_STOK" }); ok();
      await tx.purchase.update({ where: { id: alim.id }, data: { purchasedAt: gun } });
      await tx.purchaseItem.update({ where: { id: kalem.id }, data: { unitCostCurrency: "EUR" } });
      await assert.rejects(() => alimKapsaminiDogrula(tx, alim.id), { message: "KAPSAM_BIRIM" }); ok();
      // Elle seçimde para birimi kapısı DURUR (otomatikten farklı: kullanıcı açıkça seçti).
      await assert.rejects(() => alimKapsaminiDegistir(tx, kalem.id, p5.id), { message: "KAPSAM_BIRIM" }); ok();
      await tx.purchaseItem.update({ where: { id: kalem.id }, data: { unitCostCurrency: "TRY" } });
      await tx.stockMovement.create({ data: { variantId: variant.id, type: "PURCHASE_IN", quantityDelta: 1, purchaseItemId: kalem.id, occurredAt: gun } });
      await assert.rejects(() => alimKapsaminiDegistir(tx, kalem.id, p5.id), { message: "KAPSAM_KILITLI" }); ok();
      assert.equal((await tx.purchaseItem.findUniqueOrThrow({ where: { id: kalem.id } })).ortaklikProjesiId, p1.id); ok();
      await tx.purchaseItem.update({ where: { id: eskiKalem.id }, data: { damagedQuantity: 1 } });
      await assert.rejects(() => alimKapsaminiDegistir(tx, eskiKalem.id, null), { message: "KAPSAM_KILITLI" }); ok();
      await tx.purchase.update({ where: { id: alim.id }, data: { status: "CANCELLED" } });
      await assert.rejects(() => alimKapsaminiDegistir(tx, kalem.id, null), { message: "KAPSAM_KAYIT_YOK" }); ok();
      throw geriAl;
    }, { timeout: 30_000 });
  } catch (e) { if (e !== geriAl) throw e; }
  // Sayaç: bir blok sessizce atlanırsa "geçti" denmez (anayasa: ölçüt bloğu özetten önce koşar).
  if (sayi !== KONTROL_SAYISI) {
    console.log(`KOŞUM YARIM KALDI — ${sayi}/${KONTROL_SAYISI} kontrol koştu, sonuç GEÇERSİZ`);
    process.exitCode = 1;
    return;
  }
  console.log(`Ortaklık: ${sayi}/${KONTROL_SAYISI} kontrol geçti. Deneme kayıtları geri alındı.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
