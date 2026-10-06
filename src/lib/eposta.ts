import nodemailer from "nodemailer";

import { sistemPrisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  E-POSTA GÖNDERİMİ — all-inkl SMTP (K303, kullanıcı kararı 05.10.2026)
 * ----------------------------------------------------------------------------
 *  13.08.2026 kararı («e-posta altyapısı yok») 05.10'da çevrildi: alan adının
 *  kendi posta sunucusu (`bezirga.com`, all-inkl) kullanılır, yeni servis yok.
 *
 *  ⚠ SESSİZ BAŞARISIZLIK YOK (İlke #5): her deneme iz bırakır —
 *  `EPOSTA_GONDERILDI` / `EPOSTA_GONDERILEMEDI` (sebep TAM metin) /
 *  `EPOSTA_AYAR_YOK`. Süper admin «Giden e-postalar» bunları okur. Gönderim
 *  düşerse süreç DURMAZ ama sonuç çağırana döner ve ekranda yazar.
 *  ⚠ Gönderici DIŞARIDAN verilebilir (`gonderici`): bekçi gerçek e-posta
 *  göndermeden sınar. Verilmezse ortamdaki SMTP ayarlarıyla kurulur.
 *  ⚠ Parola hiçbir ize/loga yazılmaz.
 * ============================================================================
 */

export type EpostaTuru = "ASKI_UYARI" | "ASKI_UYARI_KALDIRILDI" | "ASKI_BASLADI" | "ASKI_KALDIRILDI" | "ODEME_HATIRLATMA";

export type Gonderici = { sendMail(m: { from: string; to: string; subject: string; text: string }): Promise<unknown> };

export type EpostaSonucu = { durum: "GONDERILDI" | "GONDERILEMEDI" | "AYAR_YOK"; kime: string; hata?: string };

/** Ortamdaki SMTP ayarlarıyla gönderici — ayar eksikse null. */
export function ortamGondericisi(): { gonderici: Gonderici; gonderen: string } | null {
  const host = process.env.SMTP_SUNUCU;
  const user = process.env.SMTP_KULLANICI;
  const pass = process.env.SMTP_PAROLA;
  const gonderen = process.env.EPOSTA_GONDEREN;
  if (!host || !user || !pass || !gonderen) return null;
  const port = Number(process.env.SMTP_PORT ?? "465");
  return { gonderici: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), gonderen };
}

/**
 * Bir e-postayı gönderir ve izini yazar. Fırlatmaz — sonuç döner.
 * `firmaId`: hangi firmayla ilgili (iz `companyId` alanında; süper admin
 * listesi ve firma kartı süzer).
 */
export async function epostaGonder(
  e: { kime: string; konu: string; metin: string; tur: EpostaTuru; firmaId: string | null; yapanId: string | null },
  kaynak: { gonderici: Gonderici; gonderen: string } | null = ortamGondericisi(),
): Promise<EpostaSonucu> {
  let sonuc: EpostaSonucu;
  if (!kaynak) {
    sonuc = { durum: "AYAR_YOK", kime: e.kime };
  } else {
    try {
      await kaynak.gonderici.sendMail({ from: kaynak.gonderen, to: e.kime, subject: e.konu, text: e.metin });
      sonuc = { durum: "GONDERILDI", kime: e.kime };
    } catch (hata) {
      // Mesaj TAM taşınır (anayasa: hata mesajını kısaltan işlem teşhisi kısaltır).
      sonuc = { durum: "GONDERILEMEDI", kime: e.kime, hata: String((hata as Error)?.message ?? hata).replace(/\s+/g, " ") };
    }
  }
  // SISTEM: giden e-posta izi firmalar-üstü yazılır; ilgili firma companyId'de.
  await sistemPrisma.auditLog.create({
    data: {
      action: sonuc.durum === "GONDERILDI" ? "EPOSTA_GONDERILDI" : sonuc.durum === "AYAR_YOK" ? "EPOSTA_AYAR_YOK" : "EPOSTA_GONDERILEMEDI",
      targetType: "Eposta",
      targetId: e.firmaId,
      userId: e.yapanId,
      companyId: e.firmaId,
      detail: JSON.stringify({ kime: e.kime, konu: e.konu, tur: e.tur, hata: sonuc.hata ?? null }),
    },
  });
  return sonuc;
}

export const EPOSTA_IZLERI = ["EPOSTA_GONDERILDI", "EPOSTA_GONDERILEMEDI", "EPOSTA_AYAR_YOK"] as const;

/** Giden e-postalar — izden, en yeni önce; `firmaId` verilirse o firmanınkiler. */
export async function gidenEpostalar(g: { firmaId?: string; adet?: number } = {}) {
  // SISTEM: giden e-posta izleri yönetim katmanında okunur.
  const izler = await sistemPrisma.auditLog.findMany({
    where: { action: { in: [...EPOSTA_IZLERI] }, ...(g.firmaId ? { companyId: g.firmaId } : {}) },
    orderBy: { createdAt: "desc" },
    take: g.adet ?? 100,
    select: { id: true, action: true, createdAt: true, companyId: true, detail: true, company: { select: { name: true, code: true } } },
  });
  return izler.map((i) => {
    let d: { kime?: string; konu?: string; tur?: string; hata?: string | null } = {};
    try { d = i.detail ? JSON.parse(i.detail) : {}; } catch { d = {}; }
    return {
      id: i.id,
      durum: i.action === "EPOSTA_GONDERILDI" ? "GONDERILDI" : i.action === "EPOSTA_AYAR_YOK" ? "AYAR_YOK" : "GONDERILEMEDI",
      an: i.createdAt,
      firma: i.company ? `${i.company.name} (${i.company.code})` : null,
      kime: d.kime ?? "",
      konu: d.konu ?? "",
      tur: d.tur ?? "",
      hata: d.hata ?? null,
    } as const;
  });
}
