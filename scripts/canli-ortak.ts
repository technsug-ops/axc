import { config } from "dotenv";
import { existsSync } from "node:fs";

/**
 * ============================================================================
 *  CANLI YAPILANDIRMA — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  `.env.canli` dosyasını okuyan HER betik buradan geçer. İki betik kendi
 *  okuma mantığını yazsaydı biri güncellenip diğeri unutulurdu; "canlı adres
 *  nereden geliyor" sorusunun tek bir cevabı olmalı.
 *
 *  PAROLA HİÇBİR ZAMAN EKRANA YAZILMAZ. Bu betiklerin çıktısı ekran görüntüsü
 *  olarak paylaşılıyor; `parolayiTemizle` her çıktı yolunda kullanılır.
 * ============================================================================
 */

export const CANLI_DOSYA = ".env.canli";

export type CanliYapilandirma = {
  /** Bağlantı adresi (parola içerir — EKRANA YAZILMAZ). */
  ham: string;
  /** Yalnızca paroladır; temizleme işlevine verilir. */
  parola: string;
  /** Adres hazır mı verildi, parçalardan mı kuruldu. */
  kaynak: string;
  adres: URL;
  yerelMi: boolean;
  /** Canlı sitenin adresi — verilmemişse null (HTTP kontrolleri atlanır). */
  siteAdresi: string | null;
  /** Vercel Blob jetonu — verilmemişse null (yedek kontrolü atlanır). */
  blobJetonu: string | null;
};

export type CanliHata =
  | { kod: "DOSYA_YOK" }
  | { kod: "BOS" }
  | { kod: "EKSIK"; eksikler: string[] }
  | { kod: "OKUNAMADI" };

/** Hata metinleri bağlantı dizesini içerebiliyor; parola her hâlükârda silinir. */
export function parolayiTemizle(metin: string, parola: string): string {
  let temiz = metin.replace(/(mysql:\/\/[^:\s]+:)[^@\s]+(@)/gi, "$1***$2");
  if (parola.length > 0) temiz = temiz.split(parola).join("***");
  return temiz;
}

export function canliYapilandirma():
  | { tamam: true; veri: CanliYapilandirma }
  | { tamam: false; hata: CanliHata } {
  if (!existsSync(CANLI_DOSYA)) return { tamam: false, hata: { kod: "DOSYA_YOK" } };

  const { parsed } = config({ path: CANLI_DOSYA });

  const siteAdresi = (parsed?.CANLI_ADRES ?? "").trim().replace(/\/+$/, "");
  const blobJetonu = (parsed?.BLOB_READ_WRITE_TOKEN ?? "").trim();

  /**
   * Adres ya hazır verilir ya da parçalardan kurulur.
   * Parçadan kurarken parola KAÇIRILIR (encodeURIComponent): "@" ya da ":"
   * içeren bir parola elle yazılmış adreste bağlantıyı sessizce bozardı.
   */
  const hazir = (parsed?.CANLI_DATABASE_URL ?? "").trim();
  let ham: string;
  let kaynak: string;

  if (hazir !== "") {
    ham = hazir;
    kaynak = "CANLI_DATABASE_URL";
  } else {
    const sunucu = (parsed?.CANLI_SUNUCU ?? "").trim();
    const kullanici = (parsed?.CANLI_KULLANICI ?? "").trim();
    const parola = parsed?.CANLI_PAROLA ?? "";
    const veritabani = (parsed?.CANLI_VERITABANI ?? "").trim();

    const eksikler = [
      sunucu === "" ? "CANLI_SUNUCU" : null,
      kullanici === "" ? "CANLI_KULLANICI" : null,
      parola === "" ? "CANLI_PAROLA" : null,
      veritabani === "" ? "CANLI_VERITABANI" : null,
    ].filter((x): x is string => x !== null);

    if (eksikler.length === 4) return { tamam: false, hata: { kod: "BOS" } };
    if (eksikler.length > 0) return { tamam: false, hata: { kod: "EKSIK", eksikler } };

    const port = (parsed?.CANLI_PORT ?? "3306").trim();
    ham = `mysql://${encodeURIComponent(kullanici)}:${encodeURIComponent(parola)}@${sunucu}:${port}/${veritabani}`;
    kaynak = "parçalardan kuruldu";
  }

  let adres: URL;
  try {
    adres = new URL(ham);
  } catch {
    return { tamam: false, hata: { kod: "OKUNAMADI" } };
  }

  return {
    tamam: true,
    veri: {
      ham,
      parola: adres.password,
      kaynak,
      adres,
      yerelMi: ["localhost", "127.0.0.1", "::1"].includes(adres.hostname),
      siteAdresi: siteAdresi === "" ? null : siteAdresi,
      blobJetonu: blobJetonu === "" ? null : blobJetonu,
    },
  };
}

/** Dosya yoksa ya da eksikse: ne yazılacağı TAM OLARAK gösterilir. */
export function kurulumuAnlat() {
  console.log("");
  console.log(`     Proje kökünde "${CANLI_DOSYA}" dosyası açın.`);
  console.log("     İKİ YOLDAN BİRİ yeter:");
  console.log("");
  console.log("     A) Vercel > Settings > Environment Variables > DATABASE_URL");
  console.log("        değerini kopyalayıp tek satır yazın:");
  console.log("");
  console.log("          CANLI_DATABASE_URL=mysql://kullanici:parola@sunucu:3306/veritabani");
  console.log("");
  console.log("     B) Ya da KAS panelindeki dört değeri ayrı satırlara yazın,");
  console.log("        adresi komut kendisi kurar:");
  console.log("");
  console.log("          CANLI_SUNUCU=w0216a46.kasserver.com");
  console.log("          CANLI_KULLANICI=kullanici");
  console.log("          CANLI_PAROLA=parolaniz");
  console.log("          CANLI_VERITABANI=veritabani");
  console.log("");
  console.log("     Dosya git'e GİRMEZ (.gitignore -> .env*).\n");
}
