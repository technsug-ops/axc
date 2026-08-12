/**
 * ============================================================================
 *  BAŞARI BİLDİRİMİ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Kullanıcı Kolaylığı İlkesi #5: "Her işlem sonucu (başarı/hata) Türkçe ve
 *  görünür bildirilir." Hata tarafı `HataOzeti` ile çözülmüştü; başarı tarafı
 *  eksikti — kaydet'e basınca liste ekranına dönülüyor ama kaydın gerçekten
 *  yazılıp yazılmadığını söyleyen bir cümle yoktu. Kullanıcı listeyi gözle
 *  taramak zorunda kalıyordu.
 *
 *  NASIL TAŞINIYOR: Server Action kaydı yazar ve `redirect()` ile hedef
 *  ekrana gider. Bellekte tutulan bir mesaj bu yönlendirmede kaybolur;
 *  bu yüzden sonuç ADRESTE taşınıyor (`?ok=eklendi`). Bileşen mesajı
 *  gösterdikten sonra parametreyi adresten TEMİZLER — sayfa yenilenince
 *  "kaydedildi" mesajının hayalet gibi tekrar çıkmaması için.
 *
 *  KODLAR SABİT LİSTEDİR: serbest metin taşınsaydı arayüz metni koda
 *  gömülür ve i18n kuralı delinirdi. Adreste yalnızca KOD gider, metin
 *  sözlükten çözülür.
 * ============================================================================
 */

export const BASARI_KODLARI = [
  "eklendi",
  "guncellendi",
  "silindi",
  "malKabul",
  "iadeAlindi",
] as const;

/*
 * LİSTEDE OLMAYAN: "yeniden hesapla" ve "hesap değiştir" akışları.
 * Onlar yönlendirme YAPMIYOR — aynı sayfada kalıp önce/sonra rakamlarını
 * yan yana gösteriyorlar; bu, genel bir "kaydedildi" cümlesinden daha
 * bilgilendirici. Her kod bu listede GERÇEKTEN kullanıldığı için var.
 */

export type BasariKodu = (typeof BASARI_KODLARI)[number];

/** Adresteki değer bizim tanıdığımız bir kod mu? */
export function basariKoduMu(deger: string | null): deger is BasariKodu {
  return deger !== null && (BASARI_KODLARI as readonly string[]).includes(deger);
}

/** Sorgu parametresinin adı — hem üreten hem okuyan taraf buradan alır. */
export const BASARI_PARAMETRESI = "ok";

/**
 * Yönlendirme adresine başarı kodunu ekler.
 *
 *   redirect(basariAdresi(`/urunler/${id}`, "eklendi"))
 *
 * Adreste zaten sorgu varsa korunur.
 */
export function basariAdresi(yol: string, kod: BasariKodu): string {
  const ayrac = yol.includes("?") ? "&" : "?";
  return `${yol}${ayrac}${BASARI_PARAMETRESI}=${kod}`;
}
