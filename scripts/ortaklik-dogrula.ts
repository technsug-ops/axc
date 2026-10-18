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
import { kaynakOku } from "./kaynak-oku";
import { projeSonucu, type SonucSatisi } from "../src/lib/ortaklik/sonuc";
import { agirliklaBol, anlasmaDogrula, formSayisi, gunAgirlikliSermaye, paylasimHesapla, type AnlasmaGirdisi, type AnlasmaSurumu } from "../src/lib/ortaklik/paylasim";
import { giderTahsisleriniDogrula, giderTahsisleriniYaz, projeGiderSonucu, tahsisDogrula, tahsisGirdisiOku } from "../src/lib/ortaklik/gider";
import { kapsamKuraliEkle, otomatikKapsamlar, alimKapsaminiDegistir, alimKapsaminiDogrula } from "../src/lib/ortaklik/kapsam";

const KONTROL_SAYISI = 92;

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
      // ═══ AŞAMA 3b — GİDER TAHSİSİ (veritabanı, aynı geri alınan işlem) ═══
      {
        const kat = await tx.expenseCategory.findFirstOrThrow({ select: { id: true } });
        const gider = await tx.expense.create({ data: { spentAt: gun, categoryId: kat.id, amount: "1200", currency: "TRY", vatRate: "20" } });
        const tahsisP = await tx.ortaklikProjesi.create({ data: { ad: "Tahsis", baslangic: gun } });
        const tahsisP2 = await tx.ortaklikProjesi.create({ data: { ad: "Tahsis-2", baslangic: gun } });
        const iz = await giderTahsisleriniYaz(tx, gider.id, { kip: "cok", satirlar: [{ projeId: tahsisP.id, pay: 30 }, { projeId: tahsisP2.id, pay: 20 }] });
        assert.equal(iz.once.length, 0); assert.equal(await tx.ortaklikGiderTahsisi.count({ where: { expenseId: gider.id } }), 2); ok();
        // Küme DEĞİŞTİRİLİR (eklenmez): tek projeye indirince ikinci satır gider, önceki iz döner
        const iz2 = await giderTahsisleriniYaz(tx, gider.id, { kip: "tek", satirlar: [{ projeId: tahsisP.id, pay: 40 }] });
        assert.equal(iz2.once.length, 2); assert.equal(await tx.ortaklikGiderTahsisi.count({ where: { expenseId: gider.id } }), 1); ok();
        const eurGider = await tx.expense.create({ data: { spentAt: gun, categoryId: kat.id, amount: "10", currency: "EUR", vatRate: "0" } });
        await assert.rejects(() => giderTahsisleriniYaz(tx, eurGider.id, { kip: "tek", satirlar: [{ projeId: tahsisP.id, pay: 10 }] }), { message: "TAHSIS_BIRIM" }); ok();
        const eskiGider = await tx.expense.create({ data: { spentAt: dun, categoryId: kat.id, amount: "10", currency: "TRY", vatRate: "0" } });
        await assert.rejects(() => giderTahsisleriniYaz(tx, eskiGider.id, { kip: "tek", satirlar: [{ projeId: tahsisP.id, pay: 10 }] }), { message: "TAHSIS_ESKI" }); ok();
        // Bölümsüz kayıt tahsise dokunmaz ama tarihi başlangıç önüne çekemez
        await tx.expense.update({ where: { id: gider.id }, data: { spentAt: dun } });
        await assert.rejects(() => giderTahsisleriniDogrula(tx, gider.id), { message: "TAHSIS_ESKI" }); ok();
        await tx.expense.update({ where: { id: gider.id }, data: { spentAt: gun } });
        await giderTahsisleriniDogrula(tx, gider.id);
        assert.equal(await tx.ortaklikGiderTahsisi.count({ where: { expenseId: gider.id } }), 1); ok();
        // Gider silinirse tahsisi de gider (Cascade); proje kalır
        await tx.expense.delete({ where: { id: gider.id } });
        assert.equal(await tx.ortaklikGiderTahsisi.count({ where: { projeId: tahsisP.id } }), 0); assert.ok(await tx.ortaklikProjesi.findUnique({ where: { id: tahsisP.id } })); ok();
      }
      // ═══ AŞAMA 4a — anlaşmada payı olan katılım / anlaşması olan proje silinmez ═══
      {
        const ap = await tx.ortaklikProjesi.create({ data: { ad: "Anlaşma", baslangic: gun } });
        const ao = await tx.isOrtagi.create({ data: { ad: "Anlaşma ortak" } });
        const ak = await tx.ortaklikKatilimi.create({ data: { projeId: ap.id, ortakId: ao.id, sorumluluk: "x", emek: true } });
        await tx.ortaklikAnlasmasi.create({ data: { projeId: ap.id, gecerlilikAyi: gun, kalanYontemi: "SABIT", zararYontemi: "DEVREDER", karKullanimi: "DAGIT", paylar: { create: [{ katilimId: ak.id, sabitOran: "100" }] } } });
        await assert.rejects(() => katilimSil(tx, ak.id), { message: "SILINEMEZ_BAGLI" }); ok();
        await assert.rejects(() => projeSil(tx, ap.id), { message: "SILINEMEZ_BAGLI" }); ok();
      }
      throw geriAl;
    }, { timeout: 30_000 });
  } catch (e) { if (e !== geriAl) throw e; }
  // Sayaç: bir blok sessizce atlanırsa "geçti" denmez (anayasa: ölçüt bloğu özetten önce koşar).
  // ⛔ CANLI ARIZA 18.10.2026: sunucu sayfası tarayıcı bileşenine `ikon={Trash2}` geçirdi;
  // fonksiyon sunucudan tarayıcıya geçemez ve İLK kayıt eklenince sayfa çöktü (liste
  // boşken düğme çizilmediği için hiçbir test görmedi). Sunucu sayfası ikon SEÇMEZ.
  {
    const sayfa = kaynakOku("src/app/ortaklik/page.tsx").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    assert.ok(!/^\s*["']use client["']/m.test(sayfa), "ortaklik/page.tsx sunucu bileşeni olmalı");
    assert.ok(!/\bikon=\{/.test(sayfa) && !/from "lucide-react"/.test(sayfa), "sunucu sayfası tarayıcı bileşenine ikon (fonksiyon) geçiremez");
    ok();
  }
  // ═══ AŞAMA 3a — PROJE SATIŞ SONUCU (saf gövde; veritabanı yok) ═══
  {
    const P = "proje-1";
    const cik = (adet: number, maliyet: string | null, proje: string | null) => ({ quantityDelta: -adet, birimMaliyet: maliyet, kaynakProjeId: proje });
    const satis = (ek: Partial<SonucSatisi>): SonucSatisi => ({ id: "s", kod: "K1", tarih: new Date("2026-10-10T10:00:00Z"), kanal: "TY — A", paraBirimi: "TRY", karHesaplandi: true, net1: 300, net2: 200, kalemler: [], iadeler: [], ...ek });
    // ① Uzlaşma: tek kalem, bütün mal projenin → sonuç satışın KENDİ NET'ine kuruşuna eşit
    //    (kalem NET-2 = 320, sipariş kesintisi −120 → satış NET-2 = 200).
    const tek = projeSonucu(P, "TRY", [satis({ net1: 310, net2: 200, kalemler: [{ adet: 2, birimFiyat: 1000, net1: 430, net2: 320, hareketler: [cik(2, "600", P)] }] })]);
    assert.equal(tek.toplam.net2, 200); assert.equal(tek.toplam.net1, 310); ok();
    assert.equal(tek.toplam.ciro, 2000); assert.equal(tek.toplam.maliyet, 1200); assert.equal(tek.toplam.adet, 2); ok();
    // ② Adet azalışı aynası son çıkışı kapatır: 2 çıktı, 1 geri döndü → proje adedi 1, maliyet 1 adet
    const ayna = projeSonucu(P, "TRY", [satis({ kalemler: [{ adet: 1, birimFiyat: 1000, net1: 300, net2: 200, hareketler: [cik(2, "600", P), { quantityDelta: 1, birimMaliyet: "600", kaynakProjeId: null }] }] })]);
    assert.equal(ayna.satirlar[0].projeAdedi, 1); assert.equal(ayna.toplam.maliyet, 600); ok();
    // ③ İki partiden çıkan kalem: 1 proje + 1 proje dışı → pay yarı
    const yari = projeSonucu(P, "TRY", [satis({ net1: 300, net2: 200, kalemler: [{ adet: 2, birimFiyat: 1000, net1: 300, net2: 200, hareketler: [cik(1, "600", P), cik(1, "500", null)] }] })]);
    assert.equal(yari.toplam.adet, 1); assert.equal(yari.toplam.net2, 100); assert.equal(yari.toplam.ciro, 1000); assert.equal(yari.toplam.maliyet, 600); ok();
    // ④ Karma sipariş: sipariş farkı (−100) kalemlere CİRO oranında; proje kalemi cironun %75'i
    const karma = projeSonucu(P, "TRY", [satis({ net1: 0, net2: 400, kalemler: [
      { adet: 1, birimFiyat: 3000, net1: 0, net2: 300, hareketler: [cik(1, "2000", P)] },
      { adet: 1, birimFiyat: 1000, net1: 0, net2: 200, hareketler: [cik(1, "700", null)] },
    ] })]);
    assert.equal(karma.toplam.net2, 225); ok();  // 300 + (400 − 500) × 0,75
    // ⑤ Kârı hesaplanmamış satış toplama GİRMEZ ama satırı ve sayısı VAR (yanlış susma yok)
    const yok = projeSonucu(P, "TRY", [satis({ karHesaplandi: false, net2: null, kalemler: [{ adet: 1, birimFiyat: 1000, net1: null, net2: null, hareketler: [cik(1, "600", P)] }] })]);
    assert.equal(yok.karYok, 1); assert.equal(yok.satirlar.length, 1); assert.equal(yok.toplam.net2, 0); assert.equal(yok.toplam.ciro, 0); ok();
    // ⑥ Kâr başka para biriminde → toplama girmez, sayılır
    const birim = projeSonucu(P, "TRY", [satis({ paraBirimi: "EUR", kalemler: [{ adet: 1, birimFiyat: 10, net1: 300, net2: 200, hareketler: [cik(1, "6", P)] }] })]);
    assert.equal(birim.birimFarkli, 1); assert.equal(birim.toplam.net2, 0); ok();
    // ⑦ Proje partisinden çıkmayan satış HİÇ listelenmez (yanlış yanma yok)
    const disarida = projeSonucu(P, "TRY", [satis({ kalemler: [{ adet: 1, birimFiyat: 1000, net1: 300, net2: 200, hareketler: [cik(1, "600", "baska-proje")] }] })]);
    assert.equal(disarida.satirlar.length, 0); assert.equal(disarida.toplam.adet, 0); ok();
    // ⑧ İade etkisi satışın proje payı kadar: yarı pay × (−80) = −40; hesaplanmamış iade sayılır
    const iade = projeSonucu(P, "TRY", [satis({ net1: 300, net2: 200, iadeler: [{ net1: -90, net2: -80, hesaplandi: true }, { net1: null, net2: null, hesaplandi: false }], kalemler: [{ adet: 2, birimFiyat: 1000, net1: 300, net2: 200, hareketler: [cik(1, "600", P), cik(1, "600", null)] }] })]);
    assert.equal(iade.toplam.iadeNet2, -40); assert.equal(iade.iadeHesaplanamayan, 1); ok();
    // ⑨ Maliyeti bilinmeyen proje çıkışı: maliyet null (sıfır sayılmaz)
    const bilinmez = projeSonucu(P, "TRY", [satis({ kalemler: [{ adet: 1, birimFiyat: 1000, net1: 300, net2: 200, hareketler: [cik(1, null, P)] }] })]);
    assert.equal(bilinmez.satirlar[0].maliyet, null); ok();
    // ⑩ Sayfa: kâr rakamları ayrı izne bağlı ve hesap ince kabuktan geliyor
    const sonucSayfasi = kaynakOku("src/app/ortaklik/[id]/page.tsx").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    assert.ok(/const karGorunur = baglam\.izinler\.has\("satis\.kar\.gor"\)/.test(sonucSayfasi) && /\{karGorunur \? <>/.test(sonucSayfasi), "kâr rakamları satis.kar.gor iznine bağlı olmalı");
    // ÖLÇÜT GÜNCELLENDİ (3b): çağrı artık gider okumasıyla Promise.all içinde — davranış aynı, yazılış değişti.
    assert.ok(/projeSonucuGetir\(proje, pencere\)/.test(sonucSayfasi) && /projeGiderleriGetir\(proje\.id, pencere\)/.test(sonucSayfasi), "sayfa sonucu ve gideri ince kabuktan almalı");
    ok();
  }
  // ═══ AŞAMA 3b — GİDER TAHSİSİ (saf gövde) ═══
  {
    const s1 = (pay: number, projeId = "a") => ({ projeId, pay });
    assert.equal(tahsisDogrula({ kip: "yok", satirlar: [] }), null);
    assert.equal(tahsisDogrula({ kip: "tek", satirlar: [s1(30)] }), null); ok();
    assert.equal(tahsisDogrula({ kip: "tek", satirlar: [] }), "TAHSIS_KIP");
    assert.equal(tahsisDogrula({ kip: "cok", satirlar: [s1(30)] }), "TAHSIS_KIP"); ok();
    assert.equal(tahsisDogrula({ kip: "tek", satirlar: [s1(0)] }), "TAHSIS_PAY");
    assert.equal(tahsisDogrula({ kip: "tek", satirlar: [s1(100.5)] }), "TAHSIS_PAY");
    assert.equal(tahsisDogrula({ kip: "tek", satirlar: [s1(12.345)] }), "TAHSIS_PAY"); ok();
    // Kayan nokta: 19,99 · 4,35 · 2,3 × 100 tam çıkmaz (ölçüldü) ama GEÇERLİ paydır; 33,33 × 3 = 99,99 tavanı geçmez
    assert.equal(tahsisDogrula({ kip: "cok", satirlar: [s1(19.99, "a"), s1(4.35, "b"), s1(2.3, "c")] }), null);
    assert.equal(tahsisDogrula({ kip: "cok", satirlar: [s1(33.33, "a"), s1(33.33, "b"), s1(33.33, "c")] }), null); ok();
    assert.equal(tahsisDogrula({ kip: "cok", satirlar: [s1(60, "a"), s1(50, "b")] }), "TAHSIS_TOPLAM");
    assert.equal(tahsisDogrula({ kip: "cok", satirlar: [s1(10, "a"), s1(20, "a")] }), "TAHSIS_TEKRAR");
    assert.equal(tahsisDogrula({ kip: "tek", satirlar: [s1(10, "")] }), "TAHSIS_PROJE"); ok();
    const form = (alanlar: Record<string, string | string[]>) => ({ get: (a: string) => { const v = alanlar[a]; return Array.isArray(v) ? v[0] : v ?? null; }, getAll: (a: string) => { const v = alanlar[a]; return v === undefined ? [] : Array.isArray(v) ? v : [v]; } });
    // Bölüm yoksa (bayrak yok) null → çağıran tahsise DOKUNMAZ
    assert.equal(tahsisGirdisiOku(form({ tahsisKipi: "yok" })), null); ok();
    assert.deepEqual(tahsisGirdisiOku(form({ tahsisDuzenlenebilir: "1", tahsisKipi: "tek", tahsisProje: ["p1"], tahsisPay: ["30,5"] })), { kip: "tek", satirlar: [{ projeId: "p1", pay: 30.5 }] });
    assert.deepEqual(tahsisGirdisiOku(form({ tahsisDuzenlenebilir: "1", tahsisKipi: "yok", tahsisProje: ["p1"], tahsisPay: ["30"] })), { kip: "yok", satirlar: [] }); ok();
    // KDV HARİÇ taban: 1.200 (%20) → 1.000 × %30 = 300; KDV'siz maaş 1.000 × %50 = 500
    const gs = projeGiderSonucu([
      { giderId: "g1", tarih: new Date("2026-10-10"), kategori: "Reklam", aciklama: null, tutar: 1200, kdvOrani: 20, pay: 30 },
      { giderId: "g2", tarih: new Date("2026-10-11"), kategori: "Maaş", aciklama: null, tutar: 1000, kdvOrani: 0, pay: 50 },
    ]);
    assert.equal(gs.toplam, 800); assert.equal(gs.satirlar.find((x) => x.giderId === "g1")!.projeyeDusen, 300); ok();
    // Eylemler: bölüm yoksa YAZMA değil DOĞRULAMA; izin sunucuda yeniden sorulur
    const eylem = kaynakOku("src/app/giderler/actions.ts").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    assert.ok(/return \(await izinVarMi\("ortaklik\.yonet"\)\) \? girdi : null;/.test(eylem), "tahsis izni sunucuda sorulmalı");
    assert.ok(/\} else \{\s*await giderTahsisleriniDogrula\(tx, id\);/.test(eylem), "bölüm yokken tahsise dokunulmamalı, yalnız doğrulanmalı");
    ok();
  }
  // ═══ AŞAMA 4a — KÂR PAYLAŞIMI (saf gövde) ═══
  {
    const surum = (ek: Partial<AnlasmaSurumu>): AnlasmaSurumu => ({ id: "s1", gecerlilikAyi: "2026-01", kalanYontemi: "SABIT", karmaSermayeYuzdesi: null, zararYontemi: "DEVREDER", karKullanimi: "DAGIT", paylar: [], ...ek });
    const pay = (katilimId: string, sabitOran: number, emekUcreti = 0, sorumlulukPayi = 0) => ({ katilimId, sabitOran, emekUcreti, sorumlulukPayi });
    const denklem = (r: ReturnType<typeof paylasimHesapla>) => r.filter((a) => a.durum === "TAMAM").every((a) => Math.round(Object.values(a.haklar).reduce((x, h) => x + h.toplam, 0) * 100) === Math.round((a.sonuc + a.devredenSonra - a.devredenOnce) * 100));
    // ① Tasarım §6 örneğinin AYNISI: Kasım (30 gün) · sonuç 100.000 · Siz 300.000 tüm ay · Ahmet 200.000 ayın 16'sından
    const sizS = gunAgirlikliSermaye([{ gun: "2026-11-01", tutar: 300000 }], "2026-11");
    const ahmetS = gunAgirlikliSermaye([{ gun: "2026-11-16", tutar: 200000 }], "2026-11");
    assert.equal(sizS, 300000); assert.equal(ahmetS, 100000); ok();
    const ornek = paylasimHesapla([{ ay: "2026-11", sonuc: 100000, sermaye: { siz: sizS, ahmet: ahmetS } }],
      [surum({ gecerlilikAyi: "2026-11", kalanYontemi: "KARMA", karmaSermayeYuzdesi: 50, paylar: [pay("siz", 50), pay("ahmet", 50, 10000)] })]);
    assert.equal(ornek[0].haklar.siz.toplam, 56250); assert.equal(ornek[0].haklar.ahmet.toplam, 43750); assert.ok(denklem(ornek)); ok();
    // %50 SİMETRİKTİR — karma yüzdeleri ters çevrilse de aynı sonuç çıkar (mutasyon kaçtı). %30 ile elle:
    // kalan 90.000 · %30 sermayeye 27.000 → 20.250 / 6.750 · %70 sabite 63.000 → 31.500 / 31.500
    const karma30 = paylasimHesapla([{ ay: "2026-11", sonuc: 100000, sermaye: { siz: sizS, ahmet: ahmetS } }],
      [surum({ gecerlilikAyi: "2026-11", kalanYontemi: "KARMA", karmaSermayeYuzdesi: 30, paylar: [pay("siz", 50), pay("ahmet", 50, 10000)] })]);
    assert.equal(karma30[0].haklar.siz.toplam, 51750); assert.equal(karma30[0].haklar.ahmet.toplam, 48250); assert.ok(denklem(karma30)); ok();
    // ② Zarar DEVREDER → sonraki kârdan paylaşımdan ÖNCE kapatılır
    const devir = paylasimHesapla([{ ay: "2026-01", sonuc: -1000, sermaye: {} }, { ay: "2026-02", sonuc: 3000, sermaye: {} }],
      [surum({ paylar: [pay("a", 60), pay("b", 40)] })]);
    assert.equal(devir[0].devredenSonra, 1000); assert.equal(devir[0].haklar.a.toplam, 0); ok();
    assert.equal(devir[1].mahsup, 1000); assert.equal(devir[1].bolunen, 2000); assert.equal(devir[1].haklar.a.toplam, 1200); assert.equal(devir[1].devredenSonra, 0); assert.ok(denklem(devir)); ok();
    // ③ Emek ücreti HER AY TAM (kullanıcı kararı): sonuç 5.000, ücret 8.000 → ücret 8.000 yazılır, 3.000 devreder
    const ucret = paylasimHesapla([{ ay: "2026-01", sonuc: 5000, sermaye: {} }], [surum({ paylar: [pay("a", 50, 8000), pay("b", 50)] })]);
    assert.equal(ucret[0].haklar.a.toplam, 8000); assert.equal(ucret[0].devredenSonra, 3000); assert.ok(denklem(ucret)); ok();
    // ④ Zarar kâr oranıyla (60/40) ve sorumlulukla (30/70) — ikisi FARKLI sonuç verir
    const karOrani = paylasimHesapla([{ ay: "2026-01", sonuc: -1000, sermaye: {} }], [surum({ zararYontemi: "KAR_ORANI", paylar: [pay("a", 60, 0, 30), pay("b", 40, 0, 70)] })]);
    assert.equal(karOrani[0].haklar.a.toplam, -600); assert.equal(karOrani[0].devredenSonra, 0); ok();
    const sorumluluk = paylasimHesapla([{ ay: "2026-01", sonuc: -1000, sermaye: {} }], [surum({ zararYontemi: "SORUMLULUK", paylar: [pay("a", 60, 0, 30), pay("b", 40, 0, 70)] })]);
    assert.equal(sorumluluk[0].haklar.a.toplam, -300); assert.equal(sorumluluk[0].haklar.b.toplam, -700); assert.ok(denklem(sorumluluk)); ok();
    // ⑤ Tarihli sürüm: Ocak başı yeniden yatırım, Mart başı dağıtım; Aralıkta anlaşma yok
    const surumler = [surum({ id: "A", gecerlilikAyi: "2026-01", karKullanimi: "YENIDEN_YATIRIM", paylar: [pay("a", 100)] }), surum({ id: "B", gecerlilikAyi: "2026-03", karKullanimi: "DAGIT", paylar: [pay("a", 100)] })];
    const tarihli = paylasimHesapla(["2025-12", "2026-02", "2026-03"].map((ay) => ({ ay, sonuc: 100, sermaye: {} })), surumler);
    assert.equal(tarihli[0].durum, "ANLASMA_YOK"); assert.equal(tarihli[1].surumId, "A"); assert.equal(tarihli[1].karKullanimi, "YENIDEN_YATIRIM"); assert.equal(tarihli[2].surumId, "B"); ok();
    // ⑥ Sermayeye göre ama sermaye yok → hesaplanmaz, devreden bozulmaz
    const sermayesiz = paylasimHesapla([{ ay: "2026-01", sonuc: 100, sermaye: { a: 0 } }], [surum({ kalanYontemi: "SERMAYE", paylar: [pay("a", 0)] })]);
    assert.equal(sermayesiz[0].durum, "SERMAYE_YOK"); assert.equal(Object.keys(sermayesiz[0].haklar).length, 0); ok();
    // ⑦ Kuruş: 100 üçe → 33,33 · 33,33 · 33,34 (artık en büyük paya), toplam tam
    const uc = agirliklaBol(100, { a: 1, b: 1, c: 1 })!;
    assert.equal(Math.round((uc.a + uc.b + uc.c) * 100), 10000); assert.deepEqual([uc.a, uc.b, uc.c].sort(), [33.33, 33.33, 33.34]); ok();
    // ⑧ Doğrulama
    const g = (ek: Partial<AnlasmaGirdisi>): AnlasmaGirdisi => ({ gecerlilikAyi: "2026-02", kalanYontemi: "SABIT", karmaSermayeYuzdesi: null, zararYontemi: "DEVREDER", karKullanimi: "DAGIT", paylar: [pay("a", 80.01), pay("b", 19.99)], ...ek });
    assert.equal(anlasmaDogrula(g({}), "2026-01", ["a", "b"]), null); ok();
    assert.equal(anlasmaDogrula(g({ paylar: [pay("a", 60), pay("b", 30)] }), "2026-01", ["a", "b"]), "ANLASMA_SABIT_TOPLAM");
    assert.equal(anlasmaDogrula(g({ zararYontemi: "SORUMLULUK" }), "2026-01", ["a", "b"]), "ANLASMA_SORUMLULUK_TOPLAM");
    assert.equal(anlasmaDogrula(g({ paylar: [pay("a", 100)] }), "2026-01", ["a", "b"]), "ANLASMA_KATILIM");
    assert.equal(anlasmaDogrula(g({ gecerlilikAyi: "2025-12" }), "2026-01", ["a", "b"]), "ANLASMA_ESKI_AY");
    assert.equal(anlasmaDogrula(g({ kalanYontemi: "KARMA", karmaSermayeYuzdesi: 100 }), "2026-01", ["a", "b"]), "ANLASMA_KARMA");
    assert.equal(anlasmaDogrula(g({ kalanYontemi: "SERMAYE", paylar: [pay("a", 0), pay("b", 0)] }), "2026-01", ["a", "b"]), null); ok();
    // ⑨ Türkçe sayı: nokta ondalık (telefon) · virgüllüde nokta binlik
    assert.equal(formSayisi("30.5"), 30.5); assert.equal(formSayisi("10.000,50"), 10000.5); assert.equal(formSayisi("30,5"), 30.5); assert.equal(formSayisi(""), 0); ok();
    // ⑩ Sayfa: önizleme kâr iznine bağlı, hesap ince kabuktan
    const pSayfa = kaynakOku("src/app/ortaklik/[id]/paylasim/page.tsx").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    assert.ok(/const karGorunur = baglam\.izinler\.has\("satis\.kar\.gor"\)/.test(pSayfa) && /\{karGorunur \? <section/.test(pSayfa), "önizleme satis.kar.gor iznine bağlı olmalı");
    assert.ok(/await paylasimGetir\(proje, ay\)/.test(pSayfa), "sayfa paylaşımı ince kabuktan almalı");
    ok();
  }
  if (sayi !== KONTROL_SAYISI) {
    console.log(`KOŞUM YARIM KALDI — ${sayi}/${KONTROL_SAYISI} kontrol koştu, sonuç GEÇERSİZ`);
    process.exitCode = 1;
    return;
  }
  console.log(`Ortaklık: ${sayi}/${KONTROL_SAYISI} kontrol geçti. Deneme kayıtları geri alındı.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
