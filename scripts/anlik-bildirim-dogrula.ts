/** BETIK SINIFI: TEK_SEFERLIK — BEKCI — deneme verisini tek işlemde yazar ve işlemi düşürür; yalnız yerel veritabanında koşar, ağa bildirim göndermez. */
/**
 * ANLIK BİLDİRİM bekçisi (20.10.2026). Üç kat:
 *  ① saf kararlar DEĞERİYLE (imleç · ölü abonelik · alıcı hakkı · abonelik okuma · güvenli adres)
 *  ② gönderim akışı GERÇEK veritabanında, geri alınan işlemde, SAHTE gönderici ile:
 *     kapalı · taban · yeni yok · gönderildi · eşzamanlı iki çağrıda TEK gönderim · alıcı süzgeci · yük veri taşımaz
 *  ③ bağlantılar: üç çekim ucu çağırıyor · servis çalışanı önbelleğe dokunmuyor ve ekrandayken sessiz ·
 *     sayfa/eylem izinleri
 * Hata kodu ve değerler TAM eşitlikle sınanır.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import webpush from "web-push";
import { prisma } from "../src/lib/prisma";
import { kaynakOku } from "./kaynak-oku";
import {
  abonelikOku, anahtarBaytlari, bildirimHakkiVarMi, bildirimImleciKarari, cihazEtiketi, guvenliBildirimAdresi, olusAbonelikMi, SIPARIS_IMLECI,
} from "../src/lib/bildirim/push-karar";
import { yeniSiparisBildirimiGonder, type Gonderici, type PushYuku } from "../src/lib/bildirim/push-gonder";

const KONTROL_SAYISI = 33;

async function main() {
  const adres = new URL(process.env.DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(adres.hostname), "Yalnız yerel veritabanında koşar");
  let sayi = 0;
  const ok = () => { sayi++; };
  const temiz = (y: string) => kaynakOku(y).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

  // ═══ ① SAF KARARLAR ═══
  const simdi = new Date("2026-10-20T10:00:00Z");
  assert.deepEqual(bildirimImleciKarari(null, simdi), { tur: "TABAN" }); ok();
  assert.deepEqual(bildirimImleciKarari(new Date("2026-10-20T11:00:00Z"), simdi), { tur: "TABAN" }); ok();
  // 24 saat TAVANI YOK: iki gün önceki imleç yine sayar (tek bildirim «N yeni sipariş»)
  assert.deepEqual(bildirimImleciKarari(new Date("2026-10-18T10:00:00Z"), simdi), { tur: "SAY", bas: new Date("2026-10-18T10:00:00Z") }); ok();
  assert.equal(olusAbonelikMi(404), true); assert.equal(olusAbonelikMi(410), true); ok();
  assert.equal(olusAbonelikMi(500), false); assert.equal(olusAbonelikMi(429), false); assert.equal(olusAbonelikMi(undefined), false); ok();
  const sahip = (ek: Partial<Parameters<typeof bildirimHakkiVarMi>[0]>) => bildirimHakkiVarMi({ isActive: true, ilkUyelik: { rolAktif: true, izinler: ["satis.gor"] }, ...ek }, "satis.gor");
  assert.equal(sahip({}), true); ok();
  assert.equal(sahip({ isActive: false }), false); assert.equal(sahip({ ilkUyelik: null }), false); ok();
  assert.equal(sahip({ ilkUyelik: { rolAktif: false, izinler: ["satis.gor"] } }), false); assert.equal(sahip({ ilkUyelik: { rolAktif: true, izinler: ["ortaklik.hesabim"] } }), false); ok();
  const anahtarlar = webpush.generateVAPIDKeys();
  const gecerli = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: anahtarlar.publicKey, auth: "a1B2c3D4e5F6g7H8" } };
  assert.deepEqual(abonelikOku(gecerli), { endpoint: gecerli.endpoint, p256dh: anahtarlar.publicKey, auth: "a1B2c3D4e5F6g7H8" }); ok();
  assert.equal(abonelikOku({ ...gecerli, endpoint: "http://fcm.googleapis.com/x" }), null);
  assert.equal(abonelikOku({ ...gecerli, endpoint: "https://x.y/" + "a".repeat(700) }), null);
  assert.equal(abonelikOku({ ...gecerli, keys: { ...gecerli.keys, p256dh: "kısa" } }), null);
  assert.equal(abonelikOku({ ...gecerli, keys: { ...gecerli.keys, auth: "a b" } }), null);
  assert.equal(abonelikOku({ endpoint: gecerli.endpoint }), null); assert.equal(abonelikOku(null), null); ok();
  assert.equal(guvenliBildirimAdresi("/satislar"), "/satislar");
  for (const kotu of ["//kotu.site", "https://kotu.site", "/\\kotu.site", "satislar", 7, null]) assert.equal(guvenliBildirimAdresi(kotu), "/", String(kotu));
  ok();
  assert.equal(cihazEtiketi("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36"), "Android · Chrome");
  assert.equal(cihazEtiketi("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile Safari/604.1"), "iPhone/iPad · Safari");
  assert.equal(cihazEtiketi("Mozilla/5.0 (Windows NT 10.0) Chrome/129.0 Safari/537.36 Edg/129.0"), "Windows · Edge"); ok();
  const baytlar = anahtarBaytlari(anahtarlar.publicKey);
  assert.equal(baytlar.length, 65); assert.equal(baytlar[0], 4); ok();

  // ═══ ② GÖNDERİM AKIŞI — gerçek veritabanı, geri alınan işlem, sahte gönderici ═══
  const eski = { genel: process.env.VAPID_PUBLIC_KEY, ozel: process.env.VAPID_PRIVATE_KEY, konu: process.env.VAPID_SUBJECT };
  const geriAl = new Error("ANLIK_BILDIRIM_TEST_GERI_AL");
  try {
    await prisma.$transaction(async (tx) => {
      const cagrilar: { abonelikler: string[]; yuk: PushYuku }[] = [];
      const gonder: Gonderici = async (_ayar, abonelikler, yuk) => {
        cagrilar.push({ abonelikler: abonelikler.map((a) => a.endpoint), yuk });
        return { hedef: abonelikler.length, gonderilen: abonelikler.length, silinen: 0, hatali: 0 };
      };
      const metin = async (n: number) => ({ baslik: `${n} yeni`, govde: "dokun" });
      await tx.bildirimImleci.deleteMany({ where: { anahtar: SIPARIS_IMLECI } });

      // KAPALI: anahtar yoksa hiçbir şey yazmaz
      delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY; delete process.env.VAPID_SUBJECT;
      assert.deepEqual(await yeniSiparisBildirimiGonder({ istemci: tx, gonder, metin }), { durum: "KAPALI" });
      assert.equal(await tx.bildirimImleci.count({ where: { anahtar: SIPARIS_IMLECI } }), 0); ok();
      process.env.VAPID_PUBLIC_KEY = anahtarlar.publicKey; process.env.VAPID_PRIVATE_KEY = anahtarlar.privateKey; process.env.VAPID_SUBJECT = "mailto:deneme@deneme.yerel";

      // Alıcılar: izinli · izinsiz rol · pasif kullanıcı
      const firma = await tx.company.findFirstOrThrow({ where: { isActive: true }, select: { id: true } });
      const izinliRol = await tx.role.create({ data: { name: `bildirim-izinli-${randomUUID()}`, izinler: { create: [{ permissionKey: "satis.gor" }] } } });
      const izinsizRol = await tx.role.create({ data: { name: `bildirim-izinsiz-${randomUUID()}`, izinler: { create: [{ permissionKey: "ortaklik.hesabim" }] } } });
      const kullanici = async (etiket: string, roleId: string, isActive = true) => {
        const u = await tx.user.create({ data: { email: `${etiket}-${randomUUID()}@deneme.yerel`, passwordHash: "x", isActive } });
        await tx.userCompanyRole.create({ data: { userId: u.id, companyId: firma.id, roleId } });
        await tx.pushAboneligi.create({ data: { userId: u.id, endpoint: `https://push.deneme/${etiket}-${randomUUID()}`, p256dh: anahtarlar.publicKey, auth: "a1B2c3D4e5F6g7H8" } });
        return (await tx.pushAboneligi.findFirstOrThrow({ where: { userId: u.id } })).endpoint;
      };
      const izinliUc = await kullanici("izinli", izinliRol.id);
      const izinsizUc = await kullanici("izinsiz", izinsizRol.id);
      const pasifUc = await kullanici("pasif", izinliRol.id, false);

      // TABAN: ilk çağrı imleci kurar, geçmiş için GÖNDERMEZ
      const t0 = new Date("2026-10-20T09:00:00.000Z");
      assert.deepEqual(await yeniSiparisBildirimiGonder({ simdi: t0, istemci: tx, gonder, metin }), { durum: "TABAN" });
      assert.equal(cagrilar.length, 0);
      assert.equal((await tx.bildirimImleci.findUniqueOrThrow({ where: { anahtar: SIPARIS_IMLECI } })).an.toISOString(), t0.toISOString()); ok();

      // GÖNDERİLDİ: pencere son iki iptalsiz satışı kapsar; EN YENİSİ işlem içinde iptal edilir
      // (geri alınır) → sayı onu DIŞARIDA bırakmalı. Ayrımın iki yakası: iptalli sayılsaydı sonuç farklı olurdu.
      const ikiSatis = await tx.sale.findMany({ where: { iptalTarihi: null }, orderBy: { createdAt: "desc" }, take: 2, select: { id: true, createdAt: true } });
      assert.ok(ikiSatis.length === 2 && ikiSatis[1].createdAt < ikiSatis[0].createdAt, "yerel veritabanında farklı anlı en az iki satış olmalı");
      const satis = ikiSatis[0];
      await tx.sale.update({ where: { id: satis.id }, data: { iptalTarihi: satis.createdAt } });
      const bas = new Date(ikiSatis[1].createdAt.getTime() - 1);
      const beklenen = await tx.sale.count({ where: { createdAt: { gt: bas, lte: satis.createdAt }, iptalTarihi: null } });
      const iptalliDahil = await tx.sale.count({ where: { createdAt: { gt: bas, lte: satis.createdAt } } });
      assert.ok(beklenen >= 1 && iptalliDahil > beklenen, "örnek veri iptalli ile iptalsizi ayırmalı");
      await tx.bildirimImleci.update({ where: { anahtar: SIPARIS_IMLECI }, data: { an: bas } });
      const gitti = await yeniSiparisBildirimiGonder({ simdi: satis.createdAt, istemci: tx, gonder, metin });
      assert.equal(gitti.durum, "GONDERILDI"); assert.ok("sayi" in gitti && gitti.sayi === beklenen && beklenen >= 1); ok();
      assert.equal(cagrilar.length, 1); ok();
      // Alıcı süzgeci: yalnız izinli + aktif (izinsiz rol ve pasif kullanıcı DIŞARIDA)
      assert.ok(cagrilar[0].abonelikler.includes(izinliUc)); assert.ok(!cagrilar[0].abonelikler.includes(izinsizUc)); assert.ok(!cagrilar[0].abonelikler.includes(pasifUc)); ok();
      // Yük veri taşımaz: yalnız başlık · metin · yol · etiket
      assert.deepEqual(Object.keys(cagrilar[0].yuk).sort(), ["baslik", "etiket", "govde", "url"]);
      assert.equal(cagrilar[0].yuk.url, "/satislar"); assert.equal(cagrilar[0].yuk.baslik, `${beklenen} yeni`); ok();
      assert.equal(await tx.auditLog.count({ where: { action: "ANLIK_BILDIRIM_SIPARIS", createdAt: { gte: new Date(Date.now() - 60_000) } } }) >= 1, true); ok();
      assert.equal((await tx.bildirimImleci.findUniqueOrThrow({ where: { anahtar: SIPARIS_IMLECI } })).an.toISOString(), satis.createdAt.toISOString()); ok();

      // YENİ YOK: boş aralık → gönderim yok, imleç yine ilerler
      const bosBas = new Date(satis.createdAt.getTime() + 1), bosSon = new Date(satis.createdAt.getTime() + 2);
      await tx.bildirimImleci.update({ where: { anahtar: SIPARIS_IMLECI }, data: { an: bosBas } });
      assert.deepEqual(await yeniSiparisBildirimiGonder({ simdi: bosSon, istemci: tx, gonder, metin }), { durum: "YENI_YOK" });
      assert.equal(cagrilar.length, 1);
      assert.equal((await tx.bildirimImleci.findUniqueOrThrow({ where: { anahtar: SIPARIS_IMLECI } })).an.toISOString(), bosSon.toISOString()); ok();

      // EŞZAMANLI İKİ ÇAĞRI: aynı imleci okur, yalnız biri ilerletir ve gönderir
      await tx.bildirimImleci.update({ where: { anahtar: SIPARIS_IMLECI }, data: { an: bas } });
      const [a, b] = await Promise.all([
        yeniSiparisBildirimiGonder({ simdi: satis.createdAt, istemci: tx, gonder, metin }),
        yeniSiparisBildirimiGonder({ simdi: satis.createdAt, istemci: tx, gonder, metin }),
      ]);
      assert.deepEqual([a.durum, b.durum].sort(), ["BASKASI_GONDERDI", "GONDERILDI"]); ok();
      assert.equal(cagrilar.length, 2, "eşzamanlı iki çağrı tek bildirim göndermeli"); ok();
      throw geriAl;
    }, { timeout: 60_000 });
  } catch (e) {
    if (e !== geriAl) throw e;
  } finally {
    for (const [ad, deger] of [["VAPID_PUBLIC_KEY", eski.genel], ["VAPID_PRIVATE_KEY", eski.ozel], ["VAPID_SUBJECT", eski.konu]] as const) {
      if (deger === undefined) delete process.env[ad]; else process.env[ad] = deger;
    }
  }

  // ═══ ③ BAĞLANTILAR ═══
  for (const [kanal, cagri] of [["ty", "tyCekimKos({ yaz: true, gun: 7, dbAdresi })"], ["hb", "hbCekimKos({ yaz: true, dbAdresi })"], ["n11", "n11CekimKos({ yaz: true, dbAdresi })"]] as const) {
    const rota = temiz(`src/app/api/cron/${kanal}-cekim/route.ts`);
    const i = rota.indexOf(`const ozet = await ${cagri};`);
    const j = rota.indexOf("const bildirim = await siparisBildiriminiDene();");
    assert.ok(i >= 0 && j > i, `${kanal}: bildirim çekimden SONRA çağrılmalı`);
    assert.ok(/return NextResponse\.json\(\{ \.\.\.ozet, bildirim \}, \{ status: "atlandi" in ozet \? 503 : 200 \}\);/.test(rota), `${kanal}: cevap bildirim sonucunu taşımalı`);
  }
  ok();
  const sw = kaynakOku("public/sw.js");
  const pushBas = sw.indexOf('self.addEventListener("push"');
  const pushBlok = sw.slice(pushBas, sw.indexOf('self.addEventListener("notificationclick"'));
  const tikBlok = sw.slice(sw.indexOf('self.addEventListener("notificationclick"'));
  assert.ok(pushBas > 0 && /const ekranda = pencereler\.some\(\(p\) => p\.visibilityState === "visible"\);/.test(pushBlok) && /const sessiz = sessizMi\(ekranda, etiket\);/.test(pushBlok) && /silent: sessiz,/.test(pushBlok) && /renotify: !sessiz,/.test(pushBlok), "sessizlik kararı sessizMi'den"); ok();
  // Sessizlik YALNIZ ekrandaki SİPARİŞ bildiriminde (kasa sesi o an çalıyor); deneme ve kapalı ekran SESLİ.
  const sessizMetni = sw.slice(sw.indexOf("function sessizMi("), sw.indexOf("function bildirimAdresi("));
  const sessizMi = new Function(`${sessizMetni}; return sessizMi;`)() as (e: boolean, t: string) => boolean;
  assert.equal(sessizMi(true, "yeni-siparis"), true); assert.equal(sessizMi(false, "yeni-siparis"), false);
  assert.equal(sessizMi(true, "deneme"), false); assert.equal(sessizMi(true, "bildirim"), false); ok();
  // Gönderici sipariş bildirimini bu etiketle yollar — etiket iki dosyada AYNI olmalı (yoksa sessizlik hiç tetiklenmez)
  assert.ok(/etiket: "yeni-siparis",/.test(temiz("src/lib/bildirim/push-gonder.ts")), "sipariş etiketi servis çalışanıyla aynı"); ok();
  assert.ok(/data: \{ url: bildirimAdresi\(yuk\.url\) \}/.test(pushBlok) && /new URL\(bildirimAdresi\(olay\.notification\.data && olay\.notification\.data\.url\), self\.location\.origin\)/.test(tikBlok), "dokununca yalnız güvenli yol"); ok();
  assert.ok(!/caches\.|\.put\(/.test(sw.slice(pushBas)), "bildirim dinleyicileri önbelleğe dokunmamalı"); ok();
  // Servis çalışanındaki adres süzgeci saf gövdeyle AYNI cevabı verir
  const fnMetni = sw.slice(sw.indexOf("function bildirimAdresi("), pushBas);
  const swAdres = new Function(`${fnMetni}; return bildirimAdresi;`)() as (a: unknown) => string;
  for (const ornek of ["/satislar", "//kotu.site", "https://kotu.site", "/\\kotu.site", "satislar", 7, null, "/bildirimler"]) assert.equal(swAdres(ornek), guvenliBildirimAdresi(ornek), String(ornek));
  ok();
  const sayfa = temiz("src/app/bildirimler/page.tsx");
  assert.ok(/const baglam = await sayfaIzni\("satis\.gor"\);/.test(sayfa) && /where: \{ userId: baglam\.kullaniciId \}/.test(sayfa), "sayfa izinli ve yalnız kendi cihazları"); ok();
  const ey = temiz("src/app/bildirimler/eylemler.ts");
  for (const ad of ["aboneOl", "abonelikKaldir", "denemeGonder"]) {
    const b0 = ey.indexOf(`export async function ${ad}(`);
    assert.ok(b0 >= 0 && /^[^\n]*\): Promise<BildirimSonucu> \{\s*const baglam = await yetkiIste\("satis\.gor"\);/.test(ey.slice(b0)), `${ad} izni kendi gövdesinde istemeli`);
  }
  assert.ok(/deleteMany\(\{\s*where: \{ userId: baglam\.kullaniciId, /.test(ey), "kaldırma yalnız kendi cihazına dokunmalı"); ok();

  if (sayi !== KONTROL_SAYISI) {
    console.log(`KOŞUM YARIM KALDI — ${sayi}/${KONTROL_SAYISI} kontrol koştu, sonuç GEÇERSİZ`);
    process.exitCode = 1;
    return;
  }
  console.log(`Anlık bildirim: ${sayi}/${KONTROL_SAYISI} kontrol geçti. Deneme kayıtları geri alındı, ağa bildirim gönderilmedi.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
