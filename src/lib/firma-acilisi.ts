import { randomBytes } from "node:crypto";

import { firmaIstemcisi } from "@/lib/firma-istemcisi";
import { firmaKoduNormalle } from "@/lib/oturum-firmasi";
import { parolaOzetle } from "@/lib/parola";
import { sistemPrisma } from "@/lib/prisma";
import { SAHIP_ROLU } from "@/lib/yetki/izinler";

import { giderSeed } from "../../prisma/seed-gider";
import { iadeSeed } from "../../prisma/seed-iade";
import { karMotoruSeed } from "../../prisma/seed-kar-motoru";
import { stokDuzeltmeSeed } from "../../prisma/seed-stok-duzeltme";
import { yetkiSeed } from "../../prisma/seed-yetki";

/**
 * ============================================================================
 *  YENİ FİRMA AÇILIŞI — TEK GÖVDE (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 04.10.2026: firmaları Selliora (süper admin) açar.
 *  Ekran (`/selliora/firmalar/yeni`) ve kurulum betikleri BU gövdeyi çağırır.
 *
 *  İKİ BÖLÜM (anayasa «toplu yazım üç şartla»):
 *   ① TOHUMLAR — kâr motoru, iade, gider, stok düzeltme, roller. Hepsi
 *      upsert / yineleneni atla → TEKRAR KOŞULABİLİR. Roller sağlayıcı
 *      izni TAŞIMAZ ve tohum kimseyi kendiliğinden üye yapmaz (4c-2 adım 3).
 *   ② TEK İŞLEM — yönetici (yoksa geçici parolayla açılır, ilk girişte
 *      değiştirmesi zorunlu) + Sahip üyeliği + firma AKTİF + `FIRMA_ACILDI`
 *      izi. Ya hepsi ya hiçbiri: geçici parola ancak işlem başarılıysa döner,
 *      yani hiçbir zaman «kullanıcı açıldı ama parolası kayboldu» olmaz.
 *
 *  YARIM KURULUM yeniden hesaplanır, liste tutulmaz: firma PASİF + açılışı
 *  başlamış izi VAR + açıldı izi YOK. «Kurulumu tamamla» aynı ② yolunu koşar.
 *  (Anayasa: geri alma/onarım yolu yeniden hesaplanabilir ölçüte dayanır.)
 *
 *  SISTEM: firma açılışı firmalar-üstüdür — firma bağlamı TAM OLARAK burada
 *  doğar; süzgeçli istemci henüz var olmayan firmayı bilemez.
 * ============================================================================
 */

export const FIRMA_KODU_DESENI = /^[A-Z0-9]{2,10}$/;

export type FirmaAcilisGirdisi = { ad: string; kod: string; yoneticiEposta: string; yoneticiAd: string };

export type FirmaAcilisHatasi =
  | "AD_BOS"
  | "KOD_GECERSIZ"
  | "KOD_VAR"
  | "EPOSTA_GECERSIZ"
  | "YARIM_DEGIL"
  | "FIRMA_YOK"
  | "KURULUM_HATASI";

export type FirmaAcilisSonucu =
  | { durum: "ACILDI"; firmaId: string; kod: string; yoneticiEposta: string; yeniKullanici: boolean; geciciParola: string | null }
  | { durum: "HATA"; hata: FirmaAcilisHatasi };

/** Saf — girdiyi temizler ve sınar. Hata yoksa temiz girdi döner. */
export function acilisGirdisiniSina(
  ham: FirmaAcilisGirdisi,
): { durum: "TAMAM"; girdi: FirmaAcilisGirdisi } | { durum: "HATA"; hata: FirmaAcilisHatasi } {
  const ad = ham.ad.trim();
  const kod = firmaKoduNormalle(ham.kod);
  const yoneticiEposta = ham.yoneticiEposta.trim().toLocaleLowerCase("tr");
  const yoneticiAd = ham.yoneticiAd.trim();
  if (!ad) return { durum: "HATA", hata: "AD_BOS" };
  if (!FIRMA_KODU_DESENI.test(kod)) return { durum: "HATA", hata: "KOD_GECERSIZ" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(yoneticiEposta)) return { durum: "HATA", hata: "EPOSTA_GECERSIZ" };
  return { durum: "TAMAM", girdi: { ad, kod, yoneticiEposta, yoneticiAd } };
}

/**
 * Geçici parola — açılışta ve süper adminin parola sıfırlamasında TEK gövde.
 * 9 rastgele bayt → 12 karakter (base64url); parola alt sınırını (10) aşar.
 */
export function geciciParolaUret(): string {
  return randomBytes(9).toString("base64url");
}

const BASLADI = "FIRMA_ACILIS_BASLADI";
const ACILDI = "FIRMA_ACILDI";

/** Yeni firma aç. `yapanId`: süper admin. */
export async function firmaAc(ham: FirmaAcilisGirdisi, yapanId: string): Promise<FirmaAcilisSonucu> {
  const sinama = acilisGirdisiniSina(ham);
  if (sinama.durum === "HATA") return sinama;
  const g = sinama.girdi;

  // SISTEM: firma kodu sistem genelinde tekildir (giriş ekranı onu çözer).
  if (await sistemPrisma.company.findUnique({ where: { code: g.kod }, select: { id: true } })) {
    return { durum: "HATA", hata: "KOD_VAR" };
  }
  // SISTEM: firma PASİF doğar — ② bitene kadar kimse giremez, giriş kodu çözmez.
  const firma = await sistemPrisma.company.create({ data: { name: g.ad, code: g.kod, isActive: false }, select: { id: true } });
  // SISTEM: açılışın başladığı iz — yarım kurulumun yeniden hesaplanabilir ölçütü.
  await sistemPrisma.auditLog.create({
    data: {
      action: BASLADI, targetType: "Company", targetId: firma.id, userId: yapanId, companyId: null,
      detail: JSON.stringify({ kod: g.kod, ad: g.ad, yoneticiEposta: g.yoneticiEposta, yoneticiAd: g.yoneticiAd }),
    },
  });
  return kurulumuYurut(firma.id, g, yapanId);
}

/** Yarım kalmış açılışı tamamla — girdi BAŞLADI izinden okunur. */
export async function firmaAcilisiniTamamla(firmaId: string, yapanId: string): Promise<FirmaAcilisSonucu> {
  const durum = (await kurulumDurumlari([firmaId])).get(firmaId);
  if (durum === undefined) return { durum: "HATA", hata: "FIRMA_YOK" };
  if (durum !== "YARIM") return { durum: "HATA", hata: "YARIM_DEGIL" };
  // SISTEM: açılışın girdisi kendi izinden okunur (liste tutulmaz).
  const iz = await sistemPrisma.auditLog.findFirst({
    where: { action: BASLADI, targetType: "Company", targetId: firmaId },
    orderBy: { createdAt: "desc" },
    select: { detail: true },
  });
  /* İzden okunan girdi tohumlardan ÖNCE sınanır — bozuk/eksik iz hiçbir şey
     yazdırmaz (ölçüldü 04.10.2026: kapısı gevşeyen bir koşumda «{}» izle
     tohumlar yazıldı ve firma silinemez hâle geldi). */
  let ham: Partial<FirmaAcilisGirdisi> = {};
  try { ham = JSON.parse(iz?.detail ?? "{}") as Partial<FirmaAcilisGirdisi>; } catch { ham = {}; }
  const sinama = acilisGirdisiniSina({ ad: ham.ad ?? "", kod: ham.kod ?? "", yoneticiEposta: ham.yoneticiEposta ?? "", yoneticiAd: ham.yoneticiAd ?? "" });
  if (sinama.durum === "HATA") return { durum: "HATA", hata: "KURULUM_HATASI" };
  return kurulumuYurut(firmaId, sinama.girdi, yapanId);
}

export type KurulumDurumu = "TAM" | "YARIM" | "PASIF";

/**
 * Firmaların kurulum durumu — YENİDEN HESAPLANIR. Aktif → TAM. Pasif ve
 * açılışı başlamış ama bitmemiş → YARIM. Öteki pasifler → PASIF (bilerek
 * pasife alınmış ya da bu gövdeden önce açılmış).
 */
export async function kurulumDurumlari(firmaIdleri: string[]): Promise<Map<string, KurulumDurumu>> {
  const sonuc = new Map<string, KurulumDurumu>();
  if (firmaIdleri.length === 0) return sonuc;
  // SISTEM: yönetim katmanı firmalar-üstü okur.
  const firmalar = await sistemPrisma.company.findMany({ where: { id: { in: firmaIdleri } }, select: { id: true, isActive: true } });
  // SISTEM: açılış izleri firmalar-üstüdür.
  const izler = await sistemPrisma.auditLog.findMany({
    where: { action: { in: [BASLADI, ACILDI] }, targetType: "Company", targetId: { in: firmaIdleri } },
    select: { action: true, targetId: true },
  });
  const basladi = new Set(izler.filter((i) => i.action === BASLADI).map((i) => i.targetId));
  const acildi = new Set(izler.filter((i) => i.action === ACILDI).map((i) => i.targetId));
  for (const f of firmalar) {
    sonuc.set(f.id, f.isActive ? "TAM" : basladi.has(f.id) && !acildi.has(f.id) ? "YARIM" : "PASIF");
  }
  return sonuc;
}

/** Tek firmanın kurulum durumu — `kurulumDurumlari` ile aynı ölçüt; firma yoksa PASIF değil, çağıran firmayı zaten bulmuştur. */
export async function firmaKurulumDurumu(firmaId: string): Promise<KurulumDurumu> {
  return (await kurulumDurumlari([firmaId])).get(firmaId) ?? "PASIF";
}

async function kurulumuYurut(firmaId: string, g: FirmaAcilisGirdisi, yapanId: string): Promise<FirmaAcilisSonucu> {
  // SISTEM: firmanın kendi kaydı (tohumlara verilir).
  const firma = await sistemPrisma.company.findUniqueOrThrow({ where: { id: firmaId }, select: { id: true, name: true, code: true } });
  try {
    /* ① TOHUMLAR — tekrar koşulabilir, firma istemcisiyle (her yazım bu firmaya). */
    const fp = firmaIstemcisi(process.env.DATABASE_URL ?? "", firma.id);
    try {
      await karMotoruSeed(fp, firma.id);
      await iadeSeed(fp, firma.id);
      await giderSeed(fp, firma.id);
      await stokDuzeltmeSeed(fp, firma.id);
      await yetkiSeed(fp, firma);
    } finally {
      await fp.$disconnect();
    }

    /* ② TEK İŞLEM — yönetici + üyelik + aktif + iz. */
    // SISTEM: kullanıcı küreseldir; yönetici e-postası firmalar-üstü aranır.
    const mevcut = await sistemPrisma.user.findUnique({ where: { email: g.yoneticiEposta }, select: { id: true } });
    const geciciParola = mevcut ? null : geciciParolaUret();
    const ozet = geciciParola ? await parolaOzetle(geciciParola) : null;
    // SISTEM: açılışın son adımı tek işlemde — ya hepsi ya hiçbiri.
    await sistemPrisma.$transaction(
      async (tx) => {
        const sahip = await tx.role.findFirstOrThrow({ where: { companyId: firma.id, name: SAHIP_ROLU, isSystem: true }, select: { id: true } });
        const yoneticiId = mevcut
          ? mevcut.id
          : (await tx.user.create({
              data: { email: g.yoneticiEposta, name: g.yoneticiAd || null, passwordHash: ozet!, mustChangePassword: true },
              select: { id: true },
            })).id;
        await tx.userCompanyRole.upsert({
          where: { userId_companyId: { userId: yoneticiId, companyId: firma.id } },
          update: { roleId: sahip.id },
          create: { userId: yoneticiId, companyId: firma.id, roleId: sahip.id },
        });
        await tx.company.update({ where: { id: firma.id }, data: { isActive: true } });
        await tx.auditLog.create({
          data: {
            action: ACILDI, targetType: "Company", targetId: firma.id, userId: yapanId, companyId: null,
            detail: JSON.stringify({ kod: firma.code, yoneticiEposta: g.yoneticiEposta, yeniKullanici: !mevcut }),
          },
        });
      },
      { timeout: 30_000 },
    );
    return { durum: "ACILDI", firmaId: firma.id, kod: firma.code, yoneticiEposta: g.yoneticiEposta, yeniKullanici: !mevcut, geciciParola };
  } catch (e) {
    // Hata TAM loglanır (anayasa: yakalanmamış hata yutulmuş hatanın kardeşidir);
    // firma PASİF kalır ve listede «kurulum yarım» olarak görünür.
    console.error("FIRMA_ACILISI_HATASI", firma.code, e);
    return { durum: "HATA", hata: "KURULUM_HATASI" };
  }
}

/** Firmayı pasife al / yeniden aktifleştir — YARIM kurulum buradan aktifleşmez. */
export async function firmaDurumunuDegistir(
  firmaId: string,
  aktif: boolean,
  yapanId: string,
): Promise<{ durum: "TAMAM" } | { durum: "HATA"; hata: "FIRMA_YOK" | "YARIM_KURULUM" }> {
  const durum = (await kurulumDurumlari([firmaId])).get(firmaId);
  if (durum === undefined) return { durum: "HATA", hata: "FIRMA_YOK" };
  if (durum === "YARIM") return { durum: "HATA", hata: "YARIM_KURULUM" };
  // SISTEM: yönetim katmanı firmanın durumunu değiştirir; iz aynı işlemde.
  await sistemPrisma.$transaction([
    // SISTEM: firmanın durumu (yönetim katmanı).
    sistemPrisma.company.update({ where: { id: firmaId }, data: { isActive: aktif } }),
    // SISTEM: iz firmalar-üstü, hedef firma targetId'de.
    sistemPrisma.auditLog.create({
      data: { action: aktif ? "FIRMA_AKTIFLESTI" : "FIRMA_PASIFE_ALINDI", targetType: "Company", targetId: firmaId, userId: yapanId, companyId: null, detail: null },
    }),
  ]);
  return { durum: "TAMAM" };
}
