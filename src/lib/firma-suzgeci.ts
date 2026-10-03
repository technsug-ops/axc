import { MODEL_HARITASI } from "@/lib/firma-modelleri.uretilmis";

/**
 * ============================================================================
 *  FİRMA SÜZGECİ — SAF GÖVDE (K303 Aşama 3a)
 * ----------------------------------------------------------------------------
 *  Ortak `prisma` istemcisi her sorguyu buradan geçirir (bkz. `lib/prisma.ts`).
 *  Firmaya ait bir modelde:
 *  · okuma / sayma / toplama / toplu güncelleme / toplu silme → `where`e
 *    `companyId` EKLENİR (`AND` ile — kullanıcının kendi koşulu ezilmez);
 *  · tekil anahtarlı işlemler (findUnique, update, delete, upsert) → `where`e
 *    `companyId` alanı konur (Prisma 5+: tekil anahtar + ek süzgeç geçerli);
 *  · oluşturma → `data.companyId` bağlamdan YAZILIR; İÇ İÇE oluşturulan
 *    satırlar da (satışla birlikte kalemleri) — harita şemadan üretilir.
 *  Bağlamdaki firmadan FARKLI bir `companyId` gönderilirse HATA — sessizce
 *  ezilmez, sessizce kabul de edilmez.
 *
 *  ⚠ SAF: veritabanına gitmez; bekçi bu fonksiyonları DEĞERLE sınar.
 * ============================================================================
 */

export class FirmaBaglamiHatasi extends Error {
  constructor(public kod: "FIRMA_BAGLAMI_YOK" | "FIRMA_CAKISMASI", ayrinti: string) {
    super(`${kod}: ${ayrinti}`);
    this.name = "FirmaBaglamiHatasi";
  }
}

export function firmaModeliMi(model: string | undefined): boolean {
  return Boolean(model && MODEL_HARITASI[model]?.firma);
}

const WHERE_AND_ISLEMLERI = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy",
  "updateMany", "updateManyAndReturn", "deleteMany",
]);
const WHERE_TEKIL_ISLEMLERI = new Set([
  "findUnique", "findUniqueOrThrow", "update", "delete", "upsert",
]);

type Nesne = Record<string, unknown>;
const nesneMi = (x: unknown): x is Nesne => typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * `undefined` ve `null` «verilmemiş» sayılır — bağlamdaki firma yazılır.
 * ⛔ VAKA (ölçüldü 03.10.2026): `izYaz` `companyId: veri.companyId ?? null`
 * gönderiyor; `null` «farklı firma» sayılsaydı İLK iz yazımında (her satış,
 * alım, iade) `FIRMA_CAKISMASI` patlardı. Okuma sayfaları bunu göstermedi.
 */
function catismaDenetle(deger: unknown, companyId: string, yer: string): void {
  if (deger !== undefined && deger !== null && deger !== companyId) {
    throw new FirmaBaglamiHatasi("FIRMA_CAKISMASI", `${yer}: gönderilen companyId bağlamdaki firmadan farklı`);
  }
}

/** `where` koşuluna firma ekler. */
export function whereEkle(islem: string, where: unknown, companyId: string): Nesne {
  if (WHERE_TEKIL_ISLEMLERI.has(islem)) {
    const w = nesneMi(where) ? where : {};
    catismaDenetle(w.companyId, companyId, `${islem}.where`);
    /* K303 3d: firma içi tekil anahtarlar bileşik (`companyId_sku: { companyId, sku }`).
       İçindeki firma da denetlenir — başka firmanın kimliği sessizce «bulunamadı»ya
       düşmesin, HATA versin. */
    for (const [anahtar, deger] of Object.entries(w)) {
      if (anahtar.startsWith("companyId_") && nesneMi(deger)) {
        catismaDenetle(deger.companyId, companyId, `${islem}.where.${anahtar}`);
      }
    }
    return { ...w, companyId };
  }
  return nesneMi(where) && Object.keys(where).length > 0
    ? { AND: [where, { companyId }] }
    : { companyId };
}

/**
 * Bir oluşturma verisine (ve iç içe oluşturmalara) firma yazar.
 * Kontrollü/kontrolsüz giriş biçimi korunur: veride başka bir skaler yabancı
 * anahtar varsa (kontrolsüz) `companyId`; ilişki nesnesi varsa (kontrollü)
 * `company: { connect }` — iki biçimi karıştırmak Prisma'da geçersizdir.
 */
export function veriEkle(model: string, veri: unknown, companyId: string): unknown {
  if (Array.isArray(veri)) return veri.map((v) => veriEkle(model, v, companyId));
  if (!nesneMi(veri)) return veri;
  const bilgi = MODEL_HARITASI[model];
  if (!bilgi) return veri;
  const sonuc: Nesne = { ...veri };

  if (bilgi.firma) {
    catismaDenetle(sonuc.companyId, companyId, `${model}.data`);
    const companyBag = sonuc.company;
    if (nesneMi(companyBag)) {
      const id = nesneMi(companyBag.connect) ? companyBag.connect.id : undefined;
      catismaDenetle(id, companyId, `${model}.data.company`);
    } else {
      const kontrolsuz = bilgi.yabanciAnahtarlar.some((f) => f in sonuc);
      const kontrollu = Object.keys(sonuc).some(
        (k) => k in bilgi.iliskiler && k !== "company" && nesneMi(sonuc[k]),
      );
      if (kontrollu && !kontrolsuz) sonuc.company = { connect: { id: companyId } };
      else sonuc.companyId = companyId;
    }
  }

  for (const [alan, iliski] of Object.entries(bilgi.iliskiler)) {
    const ic = sonuc[alan];
    if (!nesneMi(ic) || !firmaModeliMi(iliski.hedef)) continue;
    sonuc[alan] = icYazimEkle(iliski.hedef, ic, companyId);
  }
  return sonuc;
}

/** İlişki alanındaki iç içe yazım işlemlerine firma yazar. */
function icYazimEkle(hedef: string, ic: Nesne, companyId: string): Nesne {
  const s: Nesne = { ...ic };
  if ("create" in s) s.create = veriEkle(hedef, s.create, companyId);
  if (nesneMi(s.createMany) && "data" in s.createMany) {
    s.createMany = { ...s.createMany, data: veriEkle(hedef, s.createMany.data, companyId) };
  }
  if ("connectOrCreate" in s) {
    const coc = s.connectOrCreate;
    const tek = (x: unknown) => (nesneMi(x) ? { ...x, create: veriEkle(hedef, x.create, companyId) } : x);
    s.connectOrCreate = Array.isArray(coc) ? coc.map(tek) : tek(coc);
  }
  if ("upsert" in s) {
    const up = s.upsert;
    const tek = (x: unknown) =>
      nesneMi(x) ? { ...x, create: veriEkle(hedef, x.create, companyId), update: guncellemeEkle(hedef, x.update, companyId) } : x;
    s.upsert = Array.isArray(up) ? up.map(tek) : tek(up);
  }
  if ("update" in s) {
    const up = s.update;
    const tek = (x: unknown) => (nesneMi(x) && "data" in x ? { ...x, data: guncellemeEkle(hedef, x.data, companyId) } : guncellemeEkle(hedef, x, companyId));
    s.update = Array.isArray(up) ? up.map(tek) : tek(up);
  }
  return s;
}

/** Güncelleme verisindeki İÇ İÇE oluşturmalara firma yazar (satırın kendi companyId'si değişmez). */
export function guncellemeEkle(model: string, veri: unknown, companyId: string): unknown {
  if (!nesneMi(veri)) return veri;
  const bilgi = MODEL_HARITASI[model];
  if (!bilgi) return veri;
  const sonuc: Nesne = { ...veri };
  if (bilgi.firma) catismaDenetle(sonuc.companyId, companyId, `${model}.update.data`);
  for (const [alan, iliski] of Object.entries(bilgi.iliskiler)) {
    const ic = sonuc[alan];
    if (!nesneMi(ic) || !firmaModeliMi(iliski.hedef)) continue;
    sonuc[alan] = icYazimEkle(iliski.hedef, ic, companyId);
  }
  return sonuc;
}

/** Bir işlemin argümanlarını firmaya göre dönüştürür. Firmaya ait olmayan modelde dokunmaz. */
export function argumanlariSuz(model: string | undefined, islem: string, args: unknown, companyId: string): Nesne {
  const a: Nesne = nesneMi(args) ? { ...args } : {};
  if (!model || !firmaModeliMi(model)) return a;
  if (WHERE_AND_ISLEMLERI.has(islem) || WHERE_TEKIL_ISLEMLERI.has(islem)) a.where = whereEkle(islem, a.where, companyId);
  switch (islem) {
    case "create":
    case "createMany":
    case "createManyAndReturn":
      a.data = veriEkle(model, a.data, companyId);
      break;
    case "update":
    case "updateMany":
    case "updateManyAndReturn":
      a.data = guncellemeEkle(model, a.data, companyId);
      break;
    case "upsert":
      a.create = veriEkle(model, a.create, companyId);
      a.update = guncellemeEkle(model, a.update, companyId);
      break;
  }
  return a;
}
