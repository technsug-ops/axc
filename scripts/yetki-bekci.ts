import {
  FIRMA_IZINLERI,
  SAGLAYICI_IZINLERI,
  SAHIP_ROLU,
} from "../src/lib/yetki/izinler";

/**
 * ============================================================================
 *  YETKİ BEKÇİSİ — "TAM YETKİLİ ROL EKSİK İZİNLE KALDI MI?"
 * ----------------------------------------------------------------------------
 *  Mimar kararı 13.08.2026: bu deploy'dan ÖNCE bütün izinlere sahip olan bir
 *  rol, bu deploy'dan SONRA da bütün izinlere sahip olur. **Ölçüt izin
 *  kümesidir, rol adı değil** — isim bir etikettir, yetki değil.
 *
 *  NEDEN BEKÇİ AYRICA GEREKİYOR: senkron (`prisma/seed-yetki.ts`) eksik izni
 *  ekliyor AMA yalnız `SONRADAN_DOGAN` listesinde ADI GEÇEN anahtarları.
 *  Yeni bir izin `izinler.ts`'e yazılıp o listeye eklenmeyi unutursa senkron
 *  o rolü "eskiden de tam yetkili değildi" sayar, ATLAR ve hiçbir şey
 *  söylemez. Ekran yine sessizce kaybolur — 13.08.2026'da `/iadeler`de
 *  yaşanan tam olarak bu sınıf hatadır.
 *
 *  Bu yüzden bekçi SENKRONDAN BAĞIMSIZ ölçer: veritabanındaki rolleri
 *  koddaki tam izin listesiyle karşılaştırır.
 *
 *  BEKÇİ HİÇBİR ŞEY YAZMAZ. Yazma senkronun işi; bekçinin işi görünür
 *  kılmak. Yanlış alarmın maliyeti bir bakış, sessiz kaybın maliyeti
 *  "sistemim bozuldu" sanmak.
 * ============================================================================
 */

/**
 * BİLİNÇLİ KISITLI ROLLER — adıyla beyan edilir.
 *
 * Bu listede olan rolün eksik izni HATA DEĞİLDİR; rolün amacı budur.
 * Listede OLMAYAN ve neredeyse tam yetkili görünen bir rolün eksik izni
 * ise hatadır (bkz. `YAKINLIK_ESIGI`).
 *
 * Yeni bir kısıtlı rol ekrandan açılırsa buraya YAZILMASI GEREKMEZ — eşik
 * onu zaten kısıtlı sayar. Buraya yalnız "neredeyse tam yetkili ama bir-iki
 * izni bilerek kapalı" roller yazılır; bugün böyle bir rol yok.
 */
const BILINCLI_KISITLI: Record<string, string[]> = {
  // Rol adı -> bilerek verilmeyen izin anahtarları.
  // Örnek (bugün kullanılmıyor):
  //   "Muhasebe": ["stok.duzelt"],
};

/**
 * KISITLI ROLÜ TAM YETKİLİDEN AYIRAN EŞİK.
 *
 * Marker alanı olmadığı için "bu rol eskiden tam yetkiliydi" bilgisi
 * veritabanında YOK. Bunun yerine ölçülebilir bir soru soruyoruz: rol
 * izinlerin kaçına sahip?
 *
 *   · Gerçekten kısıtlı rol ÇOK izinden yoksundur — Operasyon 25 iznin
 *     12'sine sahip (%48), eksiği 13.
 *   · Unutulmuş izin ise BİR-İKİ tanedir — CEO 25 iznin 24'üne sahipti,
 *     eksiği 1 (`iade.gor`).
 *
 * Bu yüzden "izinlerin en az %80'ine sahip ama hepsine sahip değil" olan
 * rol ŞÜPHELİDİR ve beyan edilmedikçe hata sayılır. Ölçüldü: bugünkü iki
 * rol de bu eşikten uzakta (CEO %100, Operasyon %48) — eşik gürültü
 * üretmiyor.
 */
const YAKINLIK_ESIGI = 0.8;

/** Bekçinin ihtiyaç duyduğu tek yetenek — okuma. */
type RolOkuyucu = {
  role: {
    findMany(args: {
      select: {
        name: true;
        izinler: { select: { permissionKey: true } };
      };
    }): Promise<{ name: string; izinler: { permissionKey: string }[] }[]>;
  };
};

export type BekciSatiri = {
  rol: string;
  /** Rolün sahip olduğu FİRMA izni sayısı (sağlayıcı izinleri hariç). */
  sahipOlduguSayi: number;
  /** Sağlayıcı düzleminden bir izin taşıyor mu — raporda ayrıca yazılır. */
  saglayiciIzniVar: boolean;
  eksikler: string[];
  /** Bu satır hataya mı sebep oldu? */
  sorunlu: boolean;
  /** Ekranda gösterilecek sınıflandırma. */
  aciklama: "tam yetkili" | "kısıtlı (beklenen)" | "beyanlı kısıtlı" | "EKSİK İZİN";
};

export type BekciSonucu = {
  satirlar: BekciSatiri[];
  sorunSayisi: number;
  toplamIzin: number;
};

/** Rolleri okur, kuralı ölçer. Yazma YAPMAZ. */
export async function yetkiBekcisi(prisma: RolOkuyucu): Promise<BekciSonucu> {
  const roller = await prisma.role.findMany({
    select: { name: true, izinler: { select: { permissionKey: true } } },
  });

  const satirlar: BekciSatiri[] = roller.map((rol) => {
    const sahipOldugu = new Set(rol.izinler.map((i) => i.permissionKey));
    /**
     * ÖLÇÜT FİRMA İZİNLERİ — SAĞLAYICI İZNİ SAYILMAZ (karar 16.08.2026).
     *
     * Sağlayıcı izinleri firma rollerine otomatik dağıtılmıyor; bekçi
     * onları da arasaydı her tam yetkili rol "eksik izni var" diye kırmızı
     * yanardı ve bekçi bir süre sonra görmezden gelinen bir alarma
     * dönerdi. Bekçinin ölçütü ile seed'in ölçütü AYNI kaynaktan gelir —
     * iki yerde iki farklı ölçüt olmaz (anayasa kuralı).
     */
    const eksikler = FIRMA_IZINLERI.filter((i) => !sahipOldugu.has(i));
    const oran =
      (FIRMA_IZINLERI.length - eksikler.length) / FIRMA_IZINLERI.length;

    if (eksikler.length === 0) {
      return {
        rol: rol.name,
        sahipOlduguSayi: FIRMA_IZINLERI.filter((i) => sahipOldugu.has(i))
          .length,
        saglayiciIzniVar: SAGLAYICI_IZINLERI.some((i) => sahipOldugu.has(i)),
        eksikler,
        sorunlu: false,
        aciklama: "tam yetkili",
      };
    }

    // Beyan edilmiş kısıtlama: eksikler beyanın İÇİNDE kalıyorsa sorun yok.
    const beyan = BILINCLI_KISITLI[rol.name];
    if (beyan && eksikler.every((e) => beyan.includes(e))) {
      return {
        rol: rol.name,
        sahipOlduguSayi: FIRMA_IZINLERI.filter((i) => sahipOldugu.has(i))
          .length,
        saglayiciIzniVar: SAGLAYICI_IZINLERI.some((i) => sahipOldugu.has(i)),
        eksikler,
        sorunlu: false,
        aciklama: "beyanlı kısıtlı",
      };
    }

    // Eşiğin altındaysa gerçekten kısıtlı bir roldür; beklenen durum.
    if (oran < YAKINLIK_ESIGI) {
      return {
        rol: rol.name,
        sahipOlduguSayi: FIRMA_IZINLERI.filter((i) => sahipOldugu.has(i))
          .length,
        saglayiciIzniVar: SAGLAYICI_IZINLERI.some((i) => sahipOldugu.has(i)),
        eksikler,
        sorunlu: false,
        aciklama: "kısıtlı (beklenen)",
      };
    }

    /**
     * Neredeyse tam yetkili ama eksiği var: mimar kuralının ihlali.
     * SAHİP rolü buraya hiç düşmemeli — seed onu her koşuda tazeliyor;
     * düşerse senkronun kendisi bozuktur, bu yüzden ayrıca ayıklanmıyor.
     */
    return {
      rol: rol.name,
      sahipOlduguSayi: FIRMA_IZINLERI.filter((i) => sahipOldugu.has(i)).length,
      saglayiciIzniVar: SAGLAYICI_IZINLERI.some((i) => sahipOldugu.has(i)),
      eksikler,
      sorunlu: true,
      aciklama: "EKSİK İZİN",
    };
  });

  return {
    satirlar: satirlar.sort((a, b) => b.sahipOlduguSayi - a.sahipOlduguSayi),
    sorunSayisi: satirlar.filter((s) => s.sorunlu).length,
    // Ekranda gösterilen ölçüt de FİRMA izinleri — rapor ile kural aynı.
    toplamIzin: FIRMA_IZINLERI.length,
  };
}

/** Sonucu ekrana yazar ve sorun olup olmadığını döndürür. */
export function bekciyiYaz(sonuc: BekciSonucu): boolean {
  console.log("");
  console.log("YETKİ BEKÇİSİ — tam yetkili rol eksik izinle kalmış mı?");
  console.log(`  koddaki firma izni: ${sonuc.toplamIzin}`);
  /**
   * ÖLÇÜT DIŞI BIRAKILAN NE VARSA YAZILIR.
   *
   * Sağlayıcı izinleri bekçinin ölçütüne girmiyor — girseydi her tam
   * yetkili rol kırmızı yanardı. Ama SESSİZCE hariç tutmak, bekçinin
   * neyi görmediğini gizlemek olurdu; bu satır olmadan altı ay sonra
   * "destek.yonet niye hiç kontrol edilmiyor?" sorusunun cevabı kalmaz.
   */
  if (SAGLAYICI_IZINLERI.length > 0) {
    console.log(
      `  ölçüt DIŞI (sağlayıcı düzlemi, otomatik dağıtılmaz): ${SAGLAYICI_IZINLERI.join(", ")}`,
    );
  }
  console.log("");

  for (const s of sonuc.satirlar) {
    const isaret = s.sorunlu ? "✗" : "·";
    console.log(
      `  ${isaret}  ${s.rol.padEnd(16)} ${String(s.sahipOlduguSayi).padStart(2)}/${sonuc.toplamIzin}  ${s.aciklama}${s.saglayiciIzniVar ? "  + SAĞLAYICI" : ""}`,
    );
    if (s.sorunlu) {
      console.log(`     eksik: ${s.eksikler.join(", ")}`);
    }
  }

  console.log("");
  if (sonuc.sorunSayisi === 0) {
    console.log("  ✓ kural sağlam: tam yetkili rollerin hiçbirinde eksik izin yok");
    return true;
  }

  console.log(
    `  ✗ ${sonuc.sorunSayisi} rolde eksik izin var — bu roller neredeyse tam yetkili.`,
  );
  console.log("     Sebebi büyük olasılıkla şu: yeni izin `izinler.ts`e yazıldı ama");
  console.log("     `prisma/seed-yetki.ts` → SONRADAN_DOGAN listesine eklenmedi.");
  console.log("     Eksiklik BİLİNÇLİYSE rolü `scripts/yetki-bekci.ts` →");
  console.log("     BILINCLI_KISITLI içinde beyan edin.");
  console.log(`     (${SAHIP_ROLU} rolü her senkronda tazelenir; orada eksik çıkması`);
  console.log("      senkronun kendisinin bozulduğu anlamına gelir.)");
  return false;
}
