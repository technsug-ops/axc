import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { kimlikFirmasiSec } from "../src/lib/firma-dongusu";
import { firmaBaglamindaCalistir } from "../src/lib/firma-baglami";

/**
 * ============================================================================
 *  KOMUT SATIRINDAN KOŞAN ÇEKİM BETİKLERİNİN FİRMASI — K303 Aşama 3b
 * ----------------------------------------------------------------------------
 *  Tasarım §5: «betikler firma parametresi ister; parametresiz koşum HATA».
 *  `--firma=<kod>` verilirse o firma. Verilmezse zamanlanmış işle AYNI ölçüt
 *  (`kimlikFirmasiSec`): beyan/tek firma → o firma; birden çok firma ve beyan
 *  yok → HATA. İki yerde iki ölçüt olmaz.
 *
 *  Gövde firmanın BAĞLAMINDA koşar: betiğin içinden çağrılan ve ortak
 *  `prisma`yı kullanan yardımcılar da aynı firmaya süzülür.
 * ============================================================================
 */

export async function betikFirmasi(adres: string, beyanDegiskeni = "PAZARYERI_KIMLIK_FIRMASI"): Promise<string> {
  const arg = process.argv.find((a) => a.startsWith("--firma="))?.slice("--firma=".length).trim();
  const ham = new PrismaClient({ adapter: new PrismaMariaDb(adres) });
  try {
    // SISTEM: firma listesi firmalar-üstü bir okumadır.
    const aktif = await ham.company.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } });
    const secim = kimlikFirmasiSec(aktif, arg && arg !== "" ? arg : process.env[beyanDegiskeni]);
    if (!secim.tamam) {
      throw new Error(
        `FIRMA_SECILEMEDI (${secim.sebep}) — aktif firmalar: ${aktif.map((f) => f.code).join(", ") || "yok"}. ` +
          `Komuta --firma=<kod> ekleyin ya da .env'e ${beyanDegiskeni}=<kod> yazın.`,
      );
    }
    console.log(`Firma: ${secim.firma.code} · ${secim.firma.name}`);
    return secim.firma.id;
  } finally {
    await ham.$disconnect();
  }
}

/**
 * Komut satırı girişi. `adres` verilmezse canlı yapılandırmadan okunur (bu
 * betiklerin komut satırı kullanımı canlıya yöneliktir).
 */
export async function betikFirmasiylaKos<T>(
  adres: string | undefined,
  is: (companyId: string) => Promise<T>,
  beyanDegiskeni?: string,
): Promise<T> {
  let a = adres;
  if (!a) {
    const { canliYapilandirma } = await import("./canli-ortak");
    const c = canliYapilandirma();
    if (!c.tamam) throw new Error("CANLI ADRES OKUNAMADI — firma seçilemedi");
    a = c.veri.ham;
  }
  const companyId = await betikFirmasi(a, beyanDegiskeni);
  return firmaBaglamindaCalistir(companyId, () => is(companyId));
}

/**
 * Bekçi girişi — YEREL veritabanı (`DATABASE_URL`). Canlıya ASLA düşmez:
 * adres yoksa HATA (bekçinin canlıdan firma okuması, yanlış veritabanında
 * ölçmek olurdu).
 *
 * ⭐ BEKÇİNİN FİRMASI AYRI BEYAN (09.10.2026): `BEKCI_FIRMASI`. Deneme
 * veritabanında birden çok firma var ve beyansız tur 5 bekçide çöküyordu
 * («FIRMA_SECILEMEDI»). `PAZARYERI_KIMLIK_FIRMASI` kullanılmaz — o «kanal
 * çekimi hangi firma adına» sorusunun cevabıdır.
 * Beyan VERİ TAŞIYAN bir firmayı gösterir (deneme kurulumunda `DMS` · Damisell):
 * boş firmada (`TST1`) `toplu:dogrula` 3 varyant bulamayıp «ATLANDI» diyordu —
 * ölçmeyen bekçi geçmiş sayılmaz. Bekçiler veriyi KALICI değiştirmiyor:
 * Damisell'de önce/sonra sayımı (ürün · varyant · satış · kalem · hareket ·
 * alım · iz · iade · hareket toplamı) birebir aynı, test izi (ZZTEST ·
 * TOPLU-TEST) 0 — ölçüldü 09.10.2026. Tek firmalı veritabanında beyan
 * gerekmez (ölçüt `kimlikFirmasiSec`).
 */
export async function bekciFirmasiylaKos<T>(is: () => Promise<T>): Promise<T> {
  const adres = process.env.DATABASE_URL?.trim() ?? "";
  if (adres === "") throw new Error("DATABASE_URL tanımlı değil — bekçi firma seçemedi");
  return betikFirmasiylaKos(adres, () => is(), "BEKCI_FIRMASI");
}
