/** BETIK SINIFI: TEK_SEFERLIK — BEKCI — deneme verisini tek işlemde yazar ve işlemi düşürür; yalnız yerel veritabanında koşar, ağa bildirim göndermez. */
/**
 * SATIŞ HEDEFLERİ bekçisi (K349, 20.10.2026).
 *  ① saf: dönem pencereleri (İstanbul, yılbaşı, yıla taşan hafta) · sürüm seçimi ·
 *     ilerleme/geçildi · tutar okuma (binlik ayırıcı TAHMİN EDİLMEZ) · tebrik izni
 *  ② veritabanı (geri alınan işlem, sahte gönderici): tebrik bir kez · eşzamanlı
 *     iki çağrıda da bir kez · anahtarsız KAPALI · yük tutar taşımaz
 *  ③ kaynak: panelle aynı süzgeçler · kâr kapısı · eylem izni · yalnız ekleme
 */
import "dotenv/config";
import assert from "node:assert/strict";
import webpush from "web-push";
import { prisma } from "../src/lib/prisma";
import { kaynakOku } from "./kaynak-oku";
import { pencereOlustur } from "../src/lib/donem";
import { gecerliHedef, hedefDurumlari, hedefPenceresi, hedefTutariOku, tebrikIzni, type HedefSatiri } from "../src/lib/hedef/hedef-karar";
import { hedefRakamlari } from "../src/lib/hedef/hedef-veri";
import { hedefTebrikleriniGonder } from "../src/lib/hedef/hedef-tebrik";
import type { Gonderici, PushYuku } from "../src/lib/bildirim/push-gonder";

const KONTROL_SAYISI = 25;

async function main() {
  const adres = new URL(process.env.DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(adres.hostname), "Yalnız yerel veritabanında koşar");
  let sayi = 0;
  const ok = () => { sayi++; };
  const temiz = (y: string) => kaynakOku(y).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const gun = (d: Date) => d.toISOString().slice(0, 10);

  // ═══ ① SAF ═══
  const sali = new Date("2026-10-20T10:00:00Z"); // İstanbul salı 13:00
  assert.equal(gun(hedefPenceresi("GUN", sali).ilkGun), "2026-10-20");
  assert.equal(gun(hedefPenceresi("HAFTA", sali).ilkGun), "2026-10-19"); ok();
  assert.equal(gun(hedefPenceresi("AY", sali).ilkGun), "2026-10-01");
  assert.equal(gun(hedefPenceresi("CEYREK", sali).ilkGun), "2026-10-01");
  assert.equal(gun(hedefPenceresi("YIL", sali).ilkGun), "2026-01-01"); ok();
  assert.equal(gun(hedefPenceresi("CEYREK", new Date("2026-05-15T10:00:00Z")).ilkGun), "2026-04-01");
  assert.equal(gun(hedefPenceresi("CEYREK", new Date("2026-03-31T10:00:00Z")).ilkGun), "2026-01-01"); ok();
  // İstanbul yılbaşı: UTC 31.12 22:30 = İstanbul 01.01 01:30 → yeni yıl, yeni gün
  const yilbasi = new Date("2026-12-31T22:30:00Z");
  assert.equal(gun(hedefPenceresi("YIL", yilbasi).ilkGun), "2027-01-01"); assert.equal(gun(hedefPenceresi("GUN", yilbasi).ilkGun), "2027-01-01"); ok();
  // Yıla taşan hafta: 01.01.2027 cuma → hafta 28.12.2026 pazartesi
  assert.equal(gun(hedefPenceresi("HAFTA", new Date("2027-01-01T10:00:00Z")).ilkGun), "2026-12-28"); ok();
  // Panelin kendi pencereleriyle AYNI aralık (gün · hafta · ay)
  for (const [d, tur] of [["GUN", "BUGUN"], ["HAFTA", "BU_HAFTA"], ["AY", "BU_AY"]] as const) {
    const a = hedefPenceresi(d, sali), b = pencereOlustur(tur, sali);
    assert.equal(a.baslangic.getTime(), b.baslangic.getTime()); assert.equal(a.bitisHaric.getTime(), b.bitisHaric.getTime());
  }
  ok();
  const s = (id: string, gecerlilik: string, tutar: number | null, dakika = 0): HedefSatiri => ({ id, olcut: "CIRO", donem: "AY", tutar, gecerlilik: new Date(`${gecerlilik}T00:00:00Z`), createdAt: new Date(Date.UTC(2026, 0, 1, 0, dakika)) });
  const surumler = [s("eylul", "2026-09-01", 1000), s("ekim", "2026-10-01", 2000), s("ekim-duzeltme", "2026-10-01", 2500, 5), s("aralik-kaldir", "2026-12-01", null)];
  assert.equal(gecerliHedef(surumler, "CIRO", "AY", new Date("2026-09-01T00:00:00Z"))?.id, "eylul");
  assert.equal(gecerliHedef(surumler, "CIRO", "AY", new Date("2026-10-01T00:00:00Z"))?.id, "ekim-duzeltme"); ok();
  assert.equal(gecerliHedef(surumler, "CIRO", "AY", new Date("2026-12-01T00:00:00Z")), null);
  assert.equal(gecerliHedef(surumler, "CIRO", "AY", new Date("2026-08-01T00:00:00Z")), null);
  assert.equal(gecerliHedef(surumler, "NET2", "AY", new Date("2026-10-01T00:00:00Z")), null); ok();
  const pencereler = Object.fromEntries((["GUN", "HAFTA", "AY", "CEYREK", "YIL"] as const).map((d) => [d, hedefPenceresi(d, sali)])) as Parameters<typeof hedefDurumlari>[2];
  const sifir = { CIRO: 0, NET2: 0, SIPARIS: 0 };
  const rakam = { GUN: sifir, HAFTA: sifir, AY: { CIRO: 2500, NET2: 0, SIPARIS: 9 }, CEYREK: sifir, YIL: sifir };
  const tam = hedefDurumlari(surumler, rakam, pencereler);
  assert.equal(tam.length, 1); assert.equal(tam[0].gecildi, true); assert.equal(tam[0].oran, 1); ok();
  const eksik = hedefDurumlari(surumler, { ...rakam, AY: { ...rakam.AY, CIRO: 2499.99 } }, pencereler);
  assert.equal(eksik[0].gecildi, false); ok();
  assert.equal(tebrikIzni("NET2"), "satis.kar.gor"); assert.equal(tebrikIzni("CIRO"), "satis.gor"); assert.equal(tebrikIzni("SIPARIS"), "satis.gor"); ok();
  assert.deepEqual(hedefTutariOku("", "CIRO"), { tamam: true, tutar: null });
  assert.deepEqual(hedefTutariOku("500000", "CIRO"), { tamam: true, tutar: 500000 });
  assert.deepEqual(hedefTutariOku("1500.50", "CIRO"), { tamam: true, tutar: 1500.5 });
  assert.deepEqual(hedefTutariOku("1500,5", "NET2"), { tamam: true, tutar: 1500.5 }); ok();
  // Binlik ayırıcı TAHMİN EDİLMEZ: «500.000» 500 de 500000 de olabilir → REDDEDİLİR
  for (const kotu of ["500.000", "1.500,50", "-5", "0", "abc", "1e6"]) assert.deepEqual(hedefTutariOku(kotu, "CIRO"), { tamam: false }, kotu);
  assert.deepEqual(hedefTutariOku("12.5", "SIPARIS"), { tamam: false }); assert.deepEqual(hedefTutariOku("300", "SIPARIS"), { tamam: true, tutar: 300 }); ok();

  // ═══ ② VERİTABANI — geri alınan işlem, sahte gönderici ═══
  const anahtar = webpush.generateVAPIDKeys();
  const eski = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY, process.env.VAPID_SUBJECT];
  const geriAl = new Error("HEDEF_TEST_GERI_AL");
  try {
    await prisma.$transaction(async (tx) => {
      const son = await tx.sale.findFirst({ where: { iptalTarihi: null }, orderBy: { soldAt: "desc" }, select: { soldAt: true } });
      assert.ok(son, "yerel veritabanında satış olmalı");
      const an = son.soldAt;
      const { rakamlar, pencereler: p } = await hedefRakamlari(an, tx);
      assert.ok(rakamlar.AY.SIPARIS >= 1 && rakamlar.YIL.SIPARIS >= rakamlar.AY.SIPARIS && rakamlar.AY.SIPARIS >= rakamlar.GUN.SIPARIS, "dönemler iç içe: yıl ≥ ay ≥ gün"); ok();
      const cagrilar: PushYuku[] = [];
      const gonder: Gonderici = async (_a, abonelikler, yuk) => { cagrilar.push(yuk); return { hedef: abonelikler.length, gonderilen: abonelikler.length, silinen: 0, hatali: 0 }; };
      const metin = async () => ({ baslik: "Tebrik", govde: "geçildi" });
      await tx.hedef.deleteMany({});
      await tx.hedef.create({ data: { olcut: "SIPARIS", donem: "AY", tutar: 1, gecerlilik: p.AY.ilkGun } });
      await tx.hedef.create({ data: { olcut: "SIPARIS", donem: "YIL", tutar: 1_000_000, gecerlilik: p.YIL.ilkGun } });
      delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY; delete process.env.VAPID_SUBJECT;
      assert.deepEqual(await hedefTebrikleriniGonder({ an, istemci: tx, gonder, metin }), { durum: "KAPALI" });
      assert.equal(await tx.hedefTebrigi.count(), 0); ok();
      process.env.VAPID_PUBLIC_KEY = anahtar.publicKey; process.env.VAPID_PRIVATE_KEY = anahtar.privateKey; process.env.VAPID_SUBJECT = "mailto:deneme@deneme.yerel";
      // Geçilen (ay) tebrik alır; geçilmeyen (yıl, 1 milyon) almaz
      assert.deepEqual(await hedefTebrikleriniGonder({ an, istemci: tx, gonder, metin }), { durum: "TAMAM", verilen: 1, zatenVerilmis: 0 });
      assert.equal(cagrilar.length, 1); assert.equal(await tx.hedefTebrigi.count(), 1); ok();
      // Yük tutar taşımaz; dokununca panel
      assert.deepEqual(Object.keys(cagrilar[0]).sort(), ["baslik", "etiket", "govde", "url"]); assert.equal(cagrilar[0].url, "/"); assert.equal(cagrilar[0].etiket, "hedef-SIPARIS-AY"); ok();
      // Aynı dönemde ikinci çağrı tebrik GÖNDERMEZ
      assert.deepEqual(await hedefTebrikleriniGonder({ an, istemci: tx, gonder, metin }), { durum: "TAMAM", verilen: 0, zatenVerilmis: 1 });
      assert.equal(cagrilar.length, 1); ok();
      // Eşzamanlı iki çağrı: yeni bir hedef geçilir → toplamda TEK tebrik
      await tx.hedef.create({ data: { olcut: "SIPARIS", donem: "YIL", tutar: 1, gecerlilik: p.YIL.ilkGun } });
      const [a, b] = await Promise.all([hedefTebrikleriniGonder({ an, istemci: tx, gonder, metin }), hedefTebrikleriniGonder({ an, istemci: tx, gonder, metin })]);
      assert.ok(a.durum === "TAMAM" && b.durum === "TAMAM" && a.verilen + b.verilen === 1, "eşzamanlı iki çağrıda tek tebrik");
      assert.equal(cagrilar.length, 2); ok();
      throw geriAl;
    }, { timeout: 120_000 });
  } catch (e) {
    if (e !== geriAl) throw e;
  } finally {
    const adlar = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
    adlar.forEach((ad, i) => { if (eski[i] === undefined) delete process.env[ad]; else process.env[ad] = eski[i]; });
  }

  // ═══ ③ KAYNAK ═══
  const veri = temiz("src/lib/hedef/hedef-veri.ts");
  assert.ok(/where: \{ soldAt: \{ gte: bas, lt: son \}, iptalTarihi: null \}/.test(veri), "iptal edilen satış girmez");
  assert.ok(/items: \{ where: \{ \.\.\.KALEM_GECERLI \}/.test(veri), "kaldırılmış kalem girmez");
  assert.ok(/where: \{ sale: \{ soldAt: \{ gte: bas, lt: son \} \}, \.\.\.IADE_GECERLI \}/.test(veri), "iade satışın gününe, geri alınmış iade girmez"); ok();
  assert.ok(/satislar\.map\(panelSatisiKur\)/.test(veri) && /iadeler\.map\(panelIadesiKur\)/.test(veri) && /panelHesapla\(pencereler\[donem\], panelSatislari, panelIadeleri\)\.find\(\(b\) => b\.paraBirimi === "TRY"\)/.test(veri), "panelin dönüştürmesi ve motoru");
  assert.ok(/CIRO: blok\.toplamGelir - blok\.toplamIadeTutari, NET2: blok\.toplamNet2, SIPARIS: blok\.toplamAdet/.test(veri), "ciro net, NET-2 ve adet panel bloğundan"); ok();
  const kart = temiz("src/app/hedef-karti.tsx");
  assert.ok(/\.filter\(\(d\) => d\.olcut !== "NET2" \|\| karGorunur\)/.test(kart), "kart kâr satırını izinle süzer"); ok();
  const sayfa = temiz("src/app/ayarlar/hedefler/page.tsx");
  assert.ok(/const baglam = await sayfaIzni\("hedef\.yonet"\);/.test(sayfa) && /HEDEF_OLCUTLERI\.filter\(\(o\) => o !== "NET2" \|\| karGorunur\)/.test(sayfa) && /where: karGorunur \? \{\} : \{ olcut: \{ not: "NET2" \} \}/.test(sayfa), "sayfa izinli, kâr verisi izinsize gitmez"); ok();
  const ey = temiz("src/app/ayarlar/hedefler/eylemler.ts");
  assert.ok(/\): Promise<HedefSonucu> \{\s*const baglam = await yetkiIste\("hedef\.yonet"\);/.test(ey) && /HEDEF_OLCUTLERI\.filter\(\(o\) => o !== "NET2" \|\| karGorunur\)/.test(ey), "eylem izinli, kâr hedefi izinle");
  assert.ok(/tx\.hedef\.create\(/.test(ey) && !/hedef\.(update|delete|upsert)/.test(ey), "hedef satırı yalnız EKLENİR"); ok();
  const sonra = temiz("src/lib/bildirim/siparis-sonrasi.ts");
  assert.ok(/const hedef = siparis\.durum === "GONDERILDI" \? await hedefTebrikleriniDene\(\) : null;/.test(sonra), "hedef hesabı yalnız yeni siparişte"); ok();

  if (sayi !== KONTROL_SAYISI) {
    console.log(`KOŞUM YARIM KALDI — ${sayi}/${KONTROL_SAYISI} kontrol koştu, sonuç GEÇERSİZ`);
    process.exitCode = 1;
    return;
  }
  console.log(`Hedefler: ${sayi}/${KONTROL_SAYISI} kontrol geçti. Deneme kayıtları geri alındı.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
