import { kimlikKur, type HbKimlik, type KanalKimligi, type KanalKodu, type N11Kimlik, type TyKimlik } from "./kimlik";
import { sonDort } from "./sifre";

/**
 * ============================================================================
 *  ANAHTAR TAŞIMA PLANI — K337 3. adım ③ · SAF (kullanıcı kararı 15.10.2026
 *  «tek seferlik taşıma» + «eksiksiz taşıyalım»)
 * ----------------------------------------------------------------------------
 *  Canlı geçiş günü sunucudaki TEK TAKIM ortam anahtarları (TY · HB · N11) ait
 *  oldukları SATIŞ hesabına şifreli yazılır. Bu dosya KARAR verir, yazmaz:
 *  betik (`scripts/canli-anahtar-tasi.ts`) veriyi toplar, planı basar, onayla yazar.
 *
 *  HESAP KİMLİKLE BULUNUR (adla değil):
 *   · TY → satış hesabının \`externalId\`si = anahtardaki satıcı no
 *   · HB → \`apiHesapKimligi\` = anahtardaki Mağaza ID (çözücüyle aynı ölçüt)
 *   · N11 → anahtarda satıcı kimliği YOK: firmada TEK aktif N11 satış hesabı olmalı
 *  Bulunamayan ya da birden çok eşleşen → DURUR, nedeni yazılır («ilkini seç» yok).
 *
 *  ⛔ ÜSTÜNE YAZMAZ: hesapta FARKLI bir anahtar varsa (ekrandan girilmiş olabilir)
 *  plan «FARKLI · DURDU» der; ancak \`uzerine: true\` (betikte \`--uzerine\`) açıkça
 *  istenirse yazılır. Aynı anahtar → «AYNI · atlanır» (ikinci koşum zararsız).
 *  GERİ ALMA ölçütü yeniden hesaplanır (anayasa): anahtarı ortamdakiyle BİREBİR
 *  aynı olan hesap — liste saklanmaz.
 * ============================================================================
 */

export type OrtamAnahtarlari = { TRENDYOL: TyKimlik | null; HEPSIBURADA: HbKimlik | null; N11: N11Kimlik | null };

export type TasimaHesabi = {
  id: string;
  name: string;
  kanal: KanalKodu;
  externalId: string | null;
  apiHesapKimligi: string | null;
  /** Hesapta bugün kayıtlı anahtar: yok · açılan kimlik · açılamadı (sır değişmiş/bozuk). */
  mevcut: { tur: "YOK" } | { tur: "VAR"; kimlik: KanalKimligi } | { tur: "ACILAMADI" };
};

export type TasimaDurumu =
  | "YAZILACAK"
  | "USTUNE_YAZILACAK"
  | "AYNI"
  | "FARKLI_DURDU"
  | "MEVCUT_ACILAMADI_DURDU"
  | "ORTAMDA_YOK"
  | "ORTAM_GECERSIZ"
  | "HESAP_YOK"
  | "HESAP_BELIRSIZ";

export type TasimaKalemi = {
  kanal: KanalKodu;
  durum: TasimaDurumu;
  hesap: { id: string; name: string } | null;
  /** Yazılacak anahtarın son 4 hanesi (yalnız tanıma — anahtarın kendisi değil). */
  sonDort: string | null;
  /** Yalnız yazılacaksa — betik depoya bunu verir. */
  ham: Record<string, string> | null;
};

const KANALLAR: readonly KanalKodu[] = ["TRENDYOL", "HEPSIBURADA", "N11"];

/** Kimlik → form alanları (depo `anahtarKaydet` ile AYNI kapıdan geçsin diye ham alan olarak). */
function hamAlanlar(k: TyKimlik | HbKimlik | N11Kimlik): Record<string, string> {
  return Object.fromEntries(Object.entries(k).map(([a, v]) => [a, String(v)]));
}

/** İki kimlik aynı mı — alan alan, sıra bağımsız. */
export function ayniKimlik(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && String(a[k]) === String(b[k]));
}

function hesabiBul(kanal: KanalKodu, k: TyKimlik | HbKimlik | N11Kimlik, hesaplar: TasimaHesabi[]): TasimaHesabi[] {
  const kanaldakiler = hesaplar.filter((h) => h.kanal === kanal);
  if (kanal === "TRENDYOL") return kanaldakiler.filter((h) => h.externalId !== null && h.externalId.trim() === (k as TyKimlik).saticiId.trim());
  if (kanal === "HEPSIBURADA") return kanaldakiler.filter((h) => h.apiHesapKimligi !== null && h.apiHesapKimligi === (k as HbKimlik).merchantId);
  return kanaldakiler; // N11: kimlikte satıcı no yok — TEK hesap şartı aşağıda
}

export function tasimaPlani(ortam: OrtamAnahtarlari, hesaplar: TasimaHesabi[], ayar: { uzerine: boolean }): TasimaKalemi[] {
  return KANALLAR.map((kanal): TasimaKalemi => {
    const k = ortam[kanal];
    if (!k) return { kanal, durum: "ORTAMDA_YOK", hesap: null, sonDort: null, ham: null };
    const ham = hamAlanlar(k);
    // Depo ile AYNI biçim kapısı: ortamdaki değer bozuksa (boşluk, eksik alan) yazılmaz.
    const kur = kimlikKur(kanal, ham);
    if (kur.durum !== "TAMAM") return { kanal, durum: "ORTAM_GECERSIZ", hesap: null, sonDort: null, ham: null };
    const son = sonDort(kur.gizli);
    const adaylar = hesabiBul(kanal, kur.kimlik.kimlik, hesaplar);
    if (adaylar.length === 0) return { kanal, durum: "HESAP_YOK", hesap: null, sonDort: son, ham: null };
    if (adaylar.length > 1) return { kanal, durum: "HESAP_BELIRSIZ", hesap: null, sonDort: son, ham: null };
    const h = adaylar[0]!;
    const hesap = { id: h.id, name: h.name };
    if (h.mevcut.tur === "YOK") return { kanal, durum: "YAZILACAK", hesap, sonDort: son, ham };
    if (h.mevcut.tur === "ACILAMADI") {
      return ayar.uzerine ? { kanal, durum: "USTUNE_YAZILACAK", hesap, sonDort: son, ham } : { kanal, durum: "MEVCUT_ACILAMADI_DURDU", hesap, sonDort: son, ham: null };
    }
    if (h.mevcut.kimlik.kanal === kanal && ayniKimlik(h.mevcut.kimlik.kimlik, kur.kimlik.kimlik)) return { kanal, durum: "AYNI", hesap, sonDort: son, ham: null };
    return ayar.uzerine ? { kanal, durum: "USTUNE_YAZILACAK", hesap, sonDort: son, ham } : { kanal, durum: "FARKLI_DURDU", hesap, sonDort: son, ham: null };
  });
}

/** Yazım yapılabilir mi: en az bir kalem yazılacak VE hiçbir kalem «durdu» değil (yarım taşıma yok). */
export function tasimaYazilabilirMi(plan: TasimaKalemi[]): { yazilabilir: boolean; durduran: TasimaKalemi[] } {
  const durduran = plan.filter((k) => k.durum === "FARKLI_DURDU" || k.durum === "MEVCUT_ACILAMADI_DURDU" || k.durum === "HESAP_YOK" || k.durum === "HESAP_BELIRSIZ" || k.durum === "ORTAM_GECERSIZ");
  const yazilacak = plan.some((k) => k.durum === "YAZILACAK" || k.durum === "USTUNE_YAZILACAK");
  return { yazilabilir: yazilacak && durduran.length === 0, durduran };
}

/** GERİ ALMA kümesi — YENİDEN HESAPLANIR: anahtarı ortamdakiyle BİREBİR aynı olan hesaplar. */
export function geriAlmaKumesi(ortam: OrtamAnahtarlari, hesaplar: TasimaHesabi[]): { id: string; name: string; kanal: KanalKodu }[] {
  return hesaplar
    .filter((h) => {
      const k = ortam[h.kanal];
      return k !== null && h.mevcut.tur === "VAR" && h.mevcut.kimlik.kanal === h.kanal && ayniKimlik(h.mevcut.kimlik.kimlik, k);
    })
    .map((h) => ({ id: h.id, name: h.name, kanal: h.kanal }));
}
