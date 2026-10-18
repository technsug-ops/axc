import type { Prisma } from "@/generated/prisma/client";
import { kdvAyir } from "@/lib/kar";

/**
 * ============================================================================
 *  GİDER TAHSİSİ (K347 · Aşama 3b)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 18.10.2026: «ikisi de olsun ama seçebileyim» — bir gider
 *  ya TEK projeye yüzdeyle ya da BİRDEN ÇOK projeye bölünerek yazılır. İki kip,
 *  tek yapı (`OrtaklikGiderTahsisi`); kip yalnız ekranın sorduğu şekildir.
 *
 *  ⛔ FORMDA BÖLÜM YOKSA TAHSİSE DOKUNULMAZ. Bölüm ancak `ortaklik.yonet` izni
 *  olana çizilir ve çizildiğinde gizli `tahsisDuzenlenebilir=1` gönderir. İzni
 *  olmayan biri gideri kaydedince var olan tahsis SİLİNMEZ — sessiz veri kaybı
 *  olurdu (anayasa: «dokunmuyor iddiası da bir davranıştır»).
 * ============================================================================
 */

export type TahsisKipi = "yok" | "tek" | "cok";
export type TahsisSatiri = { projeId: string; pay: number };
export type TahsisGirdisi = { kip: TahsisKipi; satirlar: TahsisSatiri[] };

export type TahsisHatasi = "TAHSIS_KIP" | "TAHSIS_PAY" | "TAHSIS_PROJE" | "TAHSIS_TEKRAR" | "TAHSIS_TOPLAM";

/** Formdan okur. Bölüm çizilmediyse `null` — çağıran tahsise DOKUNMAZ. */
export function tahsisGirdisiOku(veri: { get(ad: string): unknown; getAll(ad: string): unknown[] }): TahsisGirdisi | null {
  if (veri.get("tahsisDuzenlenebilir") !== "1") return null;
  const kip = String(veri.get("tahsisKipi") ?? "yok") as TahsisKipi;
  const projeler = veri.getAll("tahsisProje").map((x) => String(x ?? "").trim());
  const paylar = veri.getAll("tahsisPay").map((x) => String(x ?? "").trim().replace(",", "."));
  const satirlar = projeler
    .map((projeId, i) => ({ projeId, payMetni: paylar[i] ?? "" }))
    .filter((s) => s.projeId !== "" || s.payMetni !== "")
    .map((s) => ({ projeId: s.projeId, pay: s.payMetni === "" ? NaN : Number(s.payMetni) }));
  return { kip, satirlar: kip === "yok" ? [] : satirlar };
}

/** SAF — kip ile satırların tutarlılığı, pay aralığı, tekrar ve %100 tavanı. */
export function tahsisDogrula(g: TahsisGirdisi): TahsisHatasi | null {
  if (!["yok", "tek", "cok"].includes(g.kip)) return "TAHSIS_KIP";
  if (g.kip === "yok") return null;
  if (g.kip === "tek" && g.satirlar.length !== 1) return "TAHSIS_KIP";
  if (g.kip === "cok" && g.satirlar.length < 2) return "TAHSIS_KIP";
  for (const s of g.satirlar) {
    if (!s.projeId) return "TAHSIS_PROJE";
    // 0 < pay ≤ 100, en çok iki ondalık (Decimal(5,2)) — yuvarlanmaz, reddedilir.
    // ⚠ Tam eşitlik DEĞİL — ölçüldü 18.10.2026: %0,01–%100 arası 10.000 geçerli payın 1.146'sı
    //   (ör. 19,99 → 1998,9999… · 4,35 · 2,3) kayan noktada tam çıkmaz ve reddedilirdi.
    if (!Number.isFinite(s.pay) || s.pay <= 0 || s.pay > 100 || Math.abs(Math.round(s.pay * 100) - s.pay * 100) > 1e-6) return "TAHSIS_PAY";
  }
  if (new Set(g.satirlar.map((s) => s.projeId)).size !== g.satirlar.length) return "TAHSIS_TEKRAR";
  // Kuruş tozu: 33,33 × 3 = 99,99 geçer; 100,01 geçmez.
  if (Math.round(g.satirlar.reduce((t, s) => t + s.pay * 100, 0)) > 10000) return "TAHSIS_TOPLAM";
  return null;
}

type Istemci = Pick<Prisma.TransactionClient, "ortaklikGiderTahsisi" | "ortaklikProjesi" | "expense">;

/**
 * Giderin tahsis kümesini YENİSİYLE değiştirir (aynı işlem içinde). Proje var mı,
 * gider projenin para biriminde mi, gider tarihi proje başlangıcından önce mi — burada.
 */
export async function giderTahsisleriniYaz(tx: Istemci, expenseId: string, g: TahsisGirdisi) {
  const hata = tahsisDogrula(g);
  if (hata) throw new Error(hata);
  const gider = await tx.expense.findUnique({ where: { id: expenseId }, select: { spentAt: true, currency: true } });
  if (!gider) throw new Error("TAHSIS_GIDER_YOK");
  const projeler = await tx.ortaklikProjesi.findMany({ where: { id: { in: g.satirlar.map((s) => s.projeId) } } });
  for (const s of g.satirlar) {
    const p = projeler.find((x) => x.id === s.projeId);
    if (!p) throw new Error("TAHSIS_PROJE");
    if (p.currency !== gider.currency) throw new Error("TAHSIS_BIRIM");
    if (gider.spentAt < p.baslangic) throw new Error("TAHSIS_ESKI");
  }
  const once = await tx.ortaklikGiderTahsisi.findMany({ where: { expenseId }, select: { projeId: true, payYuzdesi: true } });
  await tx.ortaklikGiderTahsisi.deleteMany({ where: { expenseId } });
  if (g.satirlar.length) {
    await tx.ortaklikGiderTahsisi.createMany({ data: g.satirlar.map((s) => ({ expenseId, projeId: s.projeId, payYuzdesi: s.pay.toFixed(2) })) });
  }
  return { once: once.map((o) => ({ projeId: o.projeId, pay: Number(o.payYuzdesi) })), sonra: g.satirlar };
}

/**
 * Bölüm çizilmeden kaydedilen gider (izinsiz kullanıcı) tahsise dokunmaz — ama
 * tarih/para birimi değişikliği VAR OLAN tahsisi geçersiz kılamaz.
 */
export async function giderTahsisleriniDogrula(tx: Istemci, expenseId: string) {
  const gider = await tx.expense.findUnique({ where: { id: expenseId }, select: { spentAt: true, currency: true, ortaklikTahsisleri: { select: { proje: { select: { currency: true, baslangic: true } } } } } });
  if (!gider) return;
  for (const t of gider.ortaklikTahsisleri) {
    if (t.proje.currency !== gider.currency) throw new Error("TAHSIS_BIRIM");
    if (gider.spentAt < t.proje.baslangic) throw new Error("TAHSIS_ESKI");
  }
}

export type ProjeGideri = {
  giderId: string;
  tarih: Date;
  kategori: string;
  aciklama: string | null;
  /** KDV dahil gider tutarı (kayıttaki). */
  tutar: number;
  kdvOrani: number;
  pay: number;
};

/**
 * SAF — projeye düşen gider, KDV HARİÇ (raporla aynı taban: `rapor.ts` gideri
 * `kdvAyir` ile ayırıp NET'ten net tutarı düşer; KDV ödenecek KDV'den mahsup edilir).
 */
export function projeGiderSonucu(giderler: ProjeGideri[]) {
  const satirlar = giderler
    .map((g) => {
      const kdvHaric = g.tutar - kdvAyir(g.tutar, g.kdvOrani);
      return { ...g, kdvHaric, projeyeDusen: Math.round(kdvHaric * g.pay) / 100 };
    })
    .sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
  const toplam = Math.round(satirlar.reduce((t, s) => t + s.projeyeDusen, 0) * 100) / 100;
  return { satirlar, toplam };
}
