/**
 * ============================================================================
 *  MENÜ DÜZENİ — SAF KURAL (K51, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"ayarlar kısmında bu butonların yerlerini değiştirebilecek bir
 *  özellik olsun; istediğimiz zaman butonların kategorilerini ve yerlerini
 *  kolay bir şekilde değiştirebilelim."_
 *
 *  ⚠ NİYE AÇILDI — SIRA ÜÇ KEZ KODDAN DEĞİŞTİ. 22.08'de yedi kalem,
 *  25.08'de `Paketle` eklendi, aynı gün kullanıcı sırayı BİREBİR verdi.
 *  Her seferinde iki dosya elden geçti, bir bekçi sınırı elle bir artırıldı
 *  ve bir deploy beklendi. Sıralamak bir KOD işi değildir.
 *
 *  ── EN KRİTİK KURAL: KATALOG KODDAN, SIRA VERİDEN ───────────────────────
 *  Kaydedilen düzen **hangi ekranların VAR OLDUĞUNU söylemez** — yalnız
 *  SIRAYI ve GRUBU söyler. Katalog koddadır.
 *
 *  ⚠ TERSİ YAPILSAYDI YETKİ TUZAĞININ AYNISI DOĞARDI: yeni bir ekran koda
 *  eklenir, kayıtlı düzende adı geçmediği için MENÜDE HİÇ GÖRÜNMEZ, ve
 *  kimse ayarlara girip eklemeyi düşünmez. Ekran canlıda vardır, ulaşan
 *  yoktur. Bu tam olarak `/iadeler`in 13.08'de sessizce kaybolmasıdır —
 *  orada izin, burada menü.
 *
 *  Bu yüzden çözüm tek yönlüdür:
 *    · katalogda VAR, düzende YOK  → varsayılan yerine EKLENİR (yeni ekran)
 *    · düzende VAR, katalogda YOK  → YOK SAYILIR (kaldırılmış ekran)
 *  Yani kayıtlı düzen hiçbir zaman bir ekranı gizleyemez.
 *
 *  ⚠ VE HİÇBİR ÖĞE İKİ YERDE DURAMAZ. Kayıt bozuk gelirse (aynı anahtar iki
 *  grupta) ilk geçtiği yer kazanır ve ikincisi düşer — sessizce çoğalan bir
 *  menü, düzenin bozulduğunu gizlerdi.
 * ============================================================================
 */

/** Koddan gelen katalog kalemi — hangi ekranlar VAR. */
export type KatalogOgesi = {
  anahtar: string;
  /**
   * Varsayılan yeri: `null` = günlük (hep açık) liste, aksi hâlde grup
   * anahtarı. Kullanıcı hiç düzenleme yapmadıysa ve yeni ekran eklendiğinde
   * geçerli olan yer budur.
   */
  varsayilanGrup: string | null;
};

/** Koddan gelen grup sırası — kullanıcı düzenlemediyse geçerli. */
export type KatalogGrubu = { anahtar: string };

/** Kaydedilen düzen — YALNIZ anahtar taşır, ekran tanımı taşımaz. */
export type KayitliDuzen = {
  gunluk: string[];
  gruplar: { anahtar: string; ogeler: string[] }[];
};

export type CozulmusDuzen = {
  gunluk: string[];
  gruplar: { anahtar: string; ogeler: string[] }[];
  /**
   * Kayıtlı düzende adı geçmeyip varsayılan yerine eklenen anahtarlar.
   * ⚠ SESSİZ EKLEME OLMAZ: ekran bunu söyleyebilmeli, yoksa kullanıcı
   * "ben bunu oraya koymamıştım" der ve düzenin bozulduğunu sanır.
   */
  yeniGelenler: string[];
  /**
   * Kayıtlı düzende olup katalogda BULUNMAYAN anahtarlar — yok sayıldı.
   * ⚠ Kaldırılmış bir ekranın izi; ayarlar ekranı bunu temizlemeyi
   * önerebilir. Sayılır ki "düzen kirlendi" görünür olsun.
   */
  taninmayanlar: string[];
};

/**
 * DÜZENİ ÇÖZ — katalog (kod) + kayıtlı düzen (veri) → ekranın çizeceği liste.
 *
 * `kayitli` `null` ise saf varsayılan döner: kullanıcı hiç düzenleme
 * yapmamış demektir ve bu bir hata değildir.
 */
export function duzeniCoz(
  katalog: readonly KatalogOgesi[],
  gruplar: readonly KatalogGrubu[],
  kayitli: KayitliDuzen | null,
): CozulmusDuzen {
  const bilinen = new Map(katalog.map((o) => [o.anahtar, o]));
  const bilinenGrup = new Set(gruplar.map((g) => g.anahtar));

  /** Yerleştirilmiş anahtarlar — bir öğe iki yerde duramaz. */
  const kullanilan = new Set<string>();
  const taninmayanlar: string[] = [];

  /** Kayıtlı bir listeyi süz: tanınmayanı at, mükerreri at. */
  const suz = (liste: readonly string[]): string[] => {
    const cikti: string[] = [];
    for (const anahtar of liste) {
      if (!bilinen.has(anahtar)) {
        if (!taninmayanlar.includes(anahtar)) taninmayanlar.push(anahtar);
        continue;
      }
      if (kullanilan.has(anahtar)) continue;
      kullanilan.add(anahtar);
      cikti.push(anahtar);
    }
    return cikti;
  };

  const gunluk = kayitli ? suz(kayitli.gunluk) : [];

  /**
   * GRUPLAR — KATALOG SIRASI KORUNUR, kayıt yalnız İÇLERİNİ dizer.
   *
   * ⚠ V1'DE GRUP EKLENMİYOR/SİLİNMİYOR. Kayıtta geçmeyen bir grup
   * düşürülseydi, koda yeni bir grup eklendiğinde görünmezdi — katalog
   * kuralının aynısı grup düzleminde de geçerli.
   */
  const cozulmusGruplar = gruplar.map((g) => {
    const kayitliGrup = kayitli?.gruplar.find((x) => x.anahtar === g.anahtar);
    return {
      anahtar: g.anahtar,
      ogeler: kayitliGrup ? suz(kayitliGrup.ogeler) : [],
    };
  });

  /** Kayıtta geçmeyen grupların içindeki anahtarlar da tanınmaz sayılır. */
  if (kayitli) {
    for (const g of kayitli.gruplar) {
      if (!bilinenGrup.has(g.anahtar)) {
        for (const a of g.ogeler) {
          if (!bilinen.has(a) && !taninmayanlar.includes(a)) {
            taninmayanlar.push(a);
          }
        }
      }
    }
  }

  /**
   * ═══ YENİ EKRANLAR — VARSAYILAN YERİNE EKLENİR ═══════════════════════
   * ⚠ BU SATIR OLMASAYDI koda eklenen her yeni ekran MENÜDE GÖRÜNMEZDİ ve
   * kimse ayarlara girip eklemeyi düşünmezdi. Ekran canlıda var, ulaşan
   * yok — `/iadeler`in 13.08'de sessizce kaybolmasının menü hâli.
   *
   * ⚠ SIRA KATALOG SIRASI: yeni gelen, kendi varsayılan komşularının
   * arasına değil SONUNA eklenir. Araya sokmak "kullanıcının dizdiği sırayı
   * bozmamak" ile çelişirdi; sona eklemek görünürlüğü sağlar ve düzeni
   * bozmaz.
   */
  const yeniGelenler: string[] = [];
  for (const oge of katalog) {
    if (kullanilan.has(oge.anahtar)) continue;
    kullanilan.add(oge.anahtar);
    /** Kayıt hiç yoksa bu "yeni gelen" değil, sadece varsayılan düzendir. */
    if (kayitli) yeniGelenler.push(oge.anahtar);

    if (oge.varsayilanGrup === null) {
      gunluk.push(oge.anahtar);
      continue;
    }
    const hedef = cozulmusGruplar.find((g) => g.anahtar === oge.varsayilanGrup);
    /**
     * ⚠ VARSAYILAN GRUBU KATALOGDA YOKSA GÜNLÜĞE DÜŞER — kaybolmaz.
     * Bir ekranın yanlış yazılmış grup adı yüzünden menüden düşmesi,
     * sessiz kaybın ta kendisi olurdu.
     */
    if (hedef) hedef.ogeler.push(oge.anahtar);
    else gunluk.push(oge.anahtar);
  }

  return { gunluk, gruplar: cozulmusGruplar, yeniGelenler, taninmayanlar };
}

/**
 * KAYIT GEÇERLİ Mİ — ayarlar ekranından gelen düzen yazılmadan önce.
 *
 * ⚠ SUNUCUDA SINANIR. İstemcinin gönderdiği şekle güvenilmez: bozuk bir
 * JSON menüyü boş bırakabilir ve kullanıcı hiçbir ekrana ulaşamaz.
 */
export function duzenGecerliMi(deger: unknown): deger is KayitliDuzen {
  if (typeof deger !== "object" || deger === null) return false;
  const d = deger as Record<string, unknown>;
  if (!Array.isArray(d.gunluk)) return false;
  if (!d.gunluk.every((x) => typeof x === "string")) return false;
  if (!Array.isArray(d.gruplar)) return false;
  return d.gruplar.every((g) => {
    if (typeof g !== "object" || g === null) return false;
    const gg = g as Record<string, unknown>;
    return (
      typeof gg.anahtar === "string" &&
      Array.isArray(gg.ogeler) &&
      gg.ogeler.every((x) => typeof x === "string")
    );
  });
}

/**
 * METİNDEN ÇÖZ — bozuksa `null`, ÇÖKMEZ.
 *
 * ⚠ BOZUK KAYIT MENÜYÜ DÜŞÜREMEZ. `JSON.parse` hatası yakalanmasaydı tek
 * bozuk karakter bütün uygulamayı 500'e düşürürdü: menü her sayfada çiziliyor.
 * Bozuk kayıt VARSAYILAN düzene döner — kullanıcı sırasını kaybeder ama
 * uygulamayı kaybetmez.
 */
export function duzeniOku(metin: string | null): KayitliDuzen | null {
  if (metin === null || metin.trim() === "") return null;
  try {
    const cozulen: unknown = JSON.parse(metin);
    return duzenGecerliMi(cozulen) ? cozulen : null;
  } catch {
    return null;
  }
}
