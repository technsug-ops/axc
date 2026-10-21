/**
 * EL KİTABI EKRAN GÖRÜNTÜLERİ — TEK LİSTE (K350-③, 21.10.2026).
 * Çekim betiği (`scripts/el-kitabi-ekran-cek.ts`) ve kitap (`icerik.ts`) bu diziden okur;
 * `el-kitabi:dogrula` her satırın dosyasının var olduğunu ve bölümünün kitapta
 * bulunduğunu sınar. Görüntüler ÖRNEK veriden çekilir (`scripts/ekran-ornek-veri.ts`).
 */
/** `public/` altındaki klasör. ⚠ `/el-kitabi` sayfa rotasıyla çakışmasın diye ayrı ad. */
export const EKRAN_KLASORU = "kitap-ekran";
export const ekranAdresi = (ad: string) => `/${EKRAN_KLASORU}/${ad}.jpg`;

export type EkranGoruntusu = {
  /** Dosya adı: `public/kitap-ekran/<ad>.jpg` (EKRAN_KLASORU). */
  ad: string;
  /** Çekilen adres. */
  yol: string;
  /** Görüntünün konduğu kitap bölümü (`BOLUMLER[].kimlik`). */
  bolum: string;
  boyut: "MASAUSTU" | "TELEFON";
  /** Görüntünün altındaki açıklama. */
  aciklama: string;
};

export const EKRANLAR: readonly EkranGoruntusu[] = [
  { ad: "panel", yol: "/", bolum: "panel", boyut: "MASAUSTU", aciklama: "Panel — seçili dönemin ciro, NET-1, NET-2 ve sipariş sayısı kutuları; altında iş akışı hunisi." },
  { ad: "panel-telefon", yol: "/", bolum: "telefon", boyut: "TELEFON", aciklama: "Aynı panel telefonda — kutular alt alta dizilir." },
  { ad: "satislar", yol: "/satislar", bolum: "satis", boyut: "MASAUSTU", aciklama: "Satışlar listesi — süzgeçler, toplam kutuları ve her satırda NET-2 ile marj." },
  { ad: "satis-yeni", yol: "/satislar/yeni", bolum: "satis", boyut: "MASAUSTU", aciklama: "Yeni satış formu — kanal hesabı, ürün, fiyat ve kargo." },
  { ad: "iadeler", yol: "/iadeler", bolum: "iade", boyut: "MASAUSTU", aciklama: "İadeler ekranı." },
  { ad: "okut", yol: "/okut", bolum: "okuma", boyut: "TELEFON", aciklama: "Barkod okut — telefonda kamera düğmesiyle." },
  { ad: "paketle", yol: "/paketle", bolum: "paketleme", boyut: "TELEFON", aciklama: "Yönlendirmeli paketleme — telefonda." },
  { ad: "mal-kabul", yol: "/mal-kabul", bolum: "malKabul", boyut: "MASAUSTU", aciklama: "Mal kabul — yolda olan alımlar." },
  { ad: "alimlar", yol: "/alimlar", bolum: "alim", boyut: "MASAUSTU", aciklama: "Alımlar listesi — durum, tutar ve kart." },
  { ad: "stok", yol: "/stok", bolum: "stok", boyut: "MASAUSTU", aciklama: "Stok — elde kalan adet, raf ve değer." },
  { ad: "urunler", yol: "/urunler", bolum: "urun", boyut: "MASAUSTU", aciklama: "Ürünler — SKU, Firma SKU ve barkod listede, tek tıkla kopyalanır." },
  { ad: "hedefler", yol: "/hedefler", bolum: "hedef", boyut: "MASAUSTU", aciklama: "Hedefler — dönem başına ilerleme çubukları." },
  { ad: "giderler", yol: "/giderler", bolum: "gider", boyut: "MASAUSTU", aciklama: "Giderler — kategori, ödeme yöntemi ve toplam." },
  { ad: "kartlar", yol: "/kartlar", bolum: "kartBorcu", boyut: "MASAUSTU", aciklama: "Kartlar ve kart borcu." },
  { ad: "rapor", yol: "/rapor", bolum: "rapor", boyut: "MASAUSTU", aciklama: "Rapor — dönem kartları ve önceki dönemle kıyas." },
  { ad: "envanter", yol: "/envanter-degeri", bolum: "envanter", boyut: "MASAUSTU", aciklama: "Envanter değeri — mal bedeli (KDV hariç) ve ödenen (KDV dahil) ayrı." },
];
