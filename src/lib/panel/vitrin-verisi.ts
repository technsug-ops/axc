import { prisma } from "@/lib/prisma";
import { KOSUM_IZI } from "@/lib/kanal-listeleme-yaz";
import { acikPartilerToplu } from "@/lib/stok";
import {
  VITRIN_SATIRLARI,
  kanalKaydiYokKosulu,
  olculenHesaplar,
  olculmemisKosulu,
  vitrinKosulu,
  type VitrinSatiri,
} from "@/lib/vitrin-kutusu";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" KUTUSU — VERİ (K121③, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ SAYI VE LİSTE AYNI GÖVDEDEN: kutu `vitrinKosulu`yla sayıyor, `/stok`
 *  aynı koşulla süzüyor. _(Anayasa: "sayı = liste"; adres ve koşul süzgeç
 *  sözleşmesinin sahibi dosyadan üretilir.)_
 *
 *  ── ⛔ KUTU ARTIK ÇOK KANALLI — VE BU BİR ARIZADAN SONRA (07.09.2026) ──
 *  Eskiden hesap şöyle seçiliyordu: _"ölçüm damgası en çok olan TEK hesap"_.
 *  Ölçüt bir kanal varken doğruydu; ikinci kanal ölçülür ölçülmez **birinciyi
 *  düşürdü.** O gün HB'ye 1098 damga yazıldı, TY'de 1051 vardı ve kutu
 *  sessizce TY'den HB'ye geçti. Ekrandan düşenler:
 *
 *      TY · engelli      9  ₺ 23.400,23
 *      TY · kaydı yok   17  ₺ 83.279,64
 *      TY · ölçülmemiş  25  ₺241.900,84   ← en pahalısı, hiç görünmedi
 *
 *  Kimse bir şey bozmadı; ölçüt tekildi. Artık ölçüm damgası olan HER hesap
 *  kendi kutusunu alır ve kanal rozetiyle durur. _(Anayasa: "kapsam
 *  genişlemesi, bağımlı listelerin de genişlemesidir".)_
 *
 *  ── ⚠ ÖLÇÜM DAMGASI HER ZAMAN GÖRÜNÜR ───────────────────────────────
 *  Hiç karşılaştırılmadıysa "—" değil **"henüz karşılaştırılmadı"** yazar.
 *  Bir tire, okuyana "veri yok" mu "sıfır" mı olduğunu söylemez; kutu bayat
 *  bir rakamı taze sanmakla, hiç ölçülmemiş bir rakamı ölçülmüş sanmak
 *  arasında fark gözetmek zorunda. _(Kullanıcı şartı 01.09.2026.)_
 *
 *  ── ⚠ SATIRLAR ₺'YE GÖRE SIRALI, SAYIYA GÖRE DEĞİL ──────────────────
 *  13 ucuz ürün 5 pahalı üründen önce gelmemeli: kutunun işi parayı
 *  göstermek. _(Kullanıcı kararı 01.09.2026.)_ Aynı ölçüt KUTULAR arasında
 *  da geçerli — en çok para hangi kanalda yatıyorsa o kanal üstte.
 * ============================================================================
 */

export type VitrinKutuSatiri = {
  satir: VitrinSatiri;
  adet: number;
  tutar: number;
};

export type VitrinKutusu = {
  hesapId: string;
  /** Rozet — kanalın kendi adı. */
  kanalAdi: string;
  /** Hesap adı; aynı kanalda birden çok hesap olabilir. */
  hesapAdi: string;
  satirlar: VitrinKutuSatiri[];
  toplamAdet: number;
  toplamTutar: number;
  /** Kanal kaydı olmayan stoklu varyantlar — AYRI, sayıya girmez. */
  kaydiYokAdet: number;
  kaydiYokTutar: number;
  /**
   * Kanal kaydı OLAN ama hiç karşılaştırılmamış stoklu varyantlar — AYRI,
   * sayıya girmez. Yeni kanal kodu girilen ürünler gece koşumuna kadar
   * burada bekler; kutuda görünmezlerse eklenen ürün ekrandan KAYBOLUR.
   */
  olculmemisAdet: number;
  olculmemisTutar: number;
  /** Son karşılaştırma anı; hiç ölçülmediyse `null`. */
  olcumAt: Date | null;
  /**
   * Ölçümün YAŞI (saat). Burada hesaplanıyor çünkü `Date.now()` render
   * içinde çağrılamaz — saf olmayan çağrı aynı girdiyle farklı çıktı verir.
   */
  yasSaat: number | null;
  /**
   * Son koşum HATA ile mi bitti.
   *
   * ⛔ NİYE AYRI: koşum düştüğünde `kanalOlcumAt` ESKİ değerinde kalır ve
   * kutu "48 saat oldu" der — YANLIŞ TEŞHİS. Sorun geçen zaman değil,
   * koşumun DÜŞMESİ; ikisi farklı iş istiyor ("zamanlayıcı çalışmıyor" ↔
   * "çalıştı ama patladı").
   */
  sonKosumBasarisiz: boolean;
  /** Başarısızlığın sebebi — ekranda görünür, kırpılmaz. */
  sonKosumMesaji: string | null;
  /**
   * Bu kanalın koşum izi HİÇ bulunamadı mı.
   *
   * ⛔ NİYE AYRI BİR ALAN: "iz yok" ile "iz var ve başarılı" AYNI ŞEY
   * DEĞİLDİR. 07.09.2026'da kutu HB'yi çizip TY'nin izini okuyordu; TY izi
   * hiç yazılmamıştı, ekranda hiçbir şey görünmedi ve bu "her şey yolunda"
   * gibi okundu. _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen
   * denetim, denetim değildir".)_
   */
  kosumIziYok: boolean;
};

/**
 * ⚠ HESAP KİMLİKLE BULUNUR, ADLA DEĞİL. _(20.08 dersi:
 * `kanalAdi === "Hepsiburada"` karşılaştırması 29 ürünü sessizce elemişti.)_
 *
 * ⛔ DÖNÜŞ BİR LİSTEDİR — ÖLÇÜLMÜŞ HER HESAP İÇİN BİR KUTU. Boş liste
 * "hiç ölçüm yok" demektir ve ekran hiçbir şey çizmez; tek bir boş kutu
 * çizmek "her şey yolunda" derdi.
 */
export async function vitrinKutusunuTopla(): Promise<VitrinKutusu[]> {
  const hesaplar = await olculenHesaplar();
  if (hesaplar.length === 0) return [];

  /** Stoklu varyantlar — ledger toplamı > 0. ⚠ Hesaplardan BAĞIMSIZ: bir kez. */
  const grup = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
    orderBy: { variantId: "asc" },
  });
  const stoklu = grup
    .filter((g) => (g._sum.quantityDelta ?? 0) > 0)
    .map((g) => g.variantId);
  if (stoklu.length === 0) return [];

  /** Envanter değeri — FIFO gövdesinden, ikinci bir hesap yazılmadan. */
  const partiler = await acikPartilerToplu(prisma, stoklu);
  const deger = new Map<string, number>();
  for (const [vid, liste] of partiler) {
    let t = 0;
    for (const p of liste) {
      /** ⚠ Maliyeti bilinmeyen parti tutara GİRMEZ — sıfır sayılmaz. */
      if (p.birimMaliyet !== null) t += p.kalanAdet * Number(p.birimMaliyet);
    }
    deger.set(vid, t);
  }

  const olc = async (kosul: Parameters<typeof prisma.productVariant.findMany>[0]) => {
    const vs = await prisma.productVariant.findMany({
      ...kosul,
      select: { id: true },
    });
    return {
      adet: vs.length,
      tutar: vs.reduce((t, v) => t + (deger.get(v.id) ?? 0), 0),
    };
  };

  const kutular: VitrinKutusu[] = [];
  for (const h of hesaplar) {
    /**
     * ⛔ ÜÇ SATIR DA HER ZAMAN DÖNER — SIFIR OLANI DA.
     *
     * NİYE DEĞİŞTİ (01.09.2026): eskiden `if (r.adet > 0)` ile sıfır satırlar
     * ATLANIYORDU ve kutu bir sabah kendiliğinden boşaldı. Kullanıcı sordu:
     * _"bu bilgilendirmeler neden gitmiş"_. Ekranda **"baktım, temiz"** ile
     * **"bu satır artık yok"** birbirinden ayırt edilemiyordu — oysa ikisi
     * bambaşka: biri hüküm, öteki sessizlik.
     * _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
     * değildir" — sıfır AÇIKÇA yazılır.)_
     */
    const satirlar: VitrinKutuSatiri[] = [];
    for (const s of VITRIN_SATIRLARI) {
      const r = await olc({
        where: vitrinKosulu({ kanalHesabiId: h.id, variantIdleri: stoklu, satir: s }),
      });
      satirlar.push({ satir: s, adet: r.adet, tutar: r.tutar });
    }
    /** ⚠ ₺'YE GÖRE SIRALI — en pahalı iş en üstte; sıfırlar kendiliğinden altta. */
    satirlar.sort((a, b) => b.tutar - a.tutar);

    const kaydiYok = await olc({
      where: kanalKaydiYokKosulu({ kanalHesabiId: h.id, variantIdleri: stoklu }),
    });

    /**
     * ⛔ HİÇ KARŞILAŞTIRILMAMIŞ SATIRLAR — ÖLÇÜLDÜ VE GÖRÜNÜR KILINDI.
     * 01.09.2026: 19 varyanta o sabah TY kodu eklendi, gece koşumu ondan sonra
     * koşmadı ve hepsi `BILINMIYOR` kaldı. Kutu onları hiçbir yerde saymıyordu;
     * kanalın kendi cevabına göre **10'u gerçekten satılamaz durumdaydı**.
     */
    const olculmemis = await olc({
      where: olculmemisKosulu({ kanalHesabiId: h.id, variantIdleri: stoklu }),
    });

    /**
     * ⚠ EN ESKİ ÖLÇÜM DAMGASI ALINIR, EN YENİSİ DEĞİL. Kutunun tamamı ancak
     * en geç ölçülen satır kadar tazedir; en yenisini yazmak kutuyu olduğundan
     * taze gösterirdi.
     */
    const damga = await prisma.channelSku.aggregate({
      where: { channelAccountId: h.id, kanalOlcumAt: { not: null } },
      _min: { kanalOlcumAt: true },
    });

    /**
     * ⚠ EN SON İZ OKUNUR — "kaç kez düştü" değil "şu an durum ne" sorusu.
     * Eski iz SİLİNMEZ, en yenisi geçerlidir (ledger disiplini izlere de işler).
     *
     * ⛔ VE İZ KANALINA GÖRE SÜZÜLÜR — 07.09.2026'DAKİ ARIZANIN ÇEKİRDEĞİ.
     * Eskiden yalnız `action` ile aranıyordu ve o ad TEKTİ: kutu HB'yi çizip
     * **TY'nin** koşum durumunu gösteriyordu. İzler artık kendi kanalını
     * yazıyor (`kosumKanali`) ve her kutu kendi kanalınınkini okuyor.
     *
     * ⚠ SÜZGEÇ `action` İLE BİRLİKTE KURULUR: `detail` serbest metindir ve
     * başka bir iz de kanal adını içerebilir; ikisi birlikte daraltıyor.
     */
    const sonIz = await prisma.auditLog.findFirst({
      where: {
        action: KOSUM_IZI,
        detail: { contains: `"kosumKanali":"${h.kanalAdi}"` },
      },
      orderBy: { createdAt: "desc" },
      select: { detail: true },
    });
    let basarisiz = false;
    let mesaj: string | null = null;
    if (sonIz?.detail) {
      try {
        const v = JSON.parse(sonIz.detail) as { basarili?: boolean; mesaj?: string };
        basarisiz = v.basarili === false;
        if (basarisiz) mesaj = v.mesaj ?? null;
      } catch {
        /**
         * ⛔ ÇÖZÜLEMEYEN İZ "BAŞARILI" SAYILMAZ — bozuk bir kayıt sessizce
         * iyimser okunursa gerçek bir arıza görünmez kalır.
         */
        basarisiz = true;
        mesaj = "Koşum izi okunamadı (bozuk kayıt).";
      }
    }

    kutular.push({
      hesapId: h.id,
      kanalAdi: h.kanalAdi,
      hesapAdi: h.hesapAdi,
      satirlar,
      toplamAdet: satirlar.reduce((t, s) => t + s.adet, 0),
      toplamTutar: satirlar.reduce((t, s) => t + s.tutar, 0),
      kaydiYokAdet: kaydiYok.adet,
      kaydiYokTutar: kaydiYok.tutar,
      olculmemisAdet: olculmemis.adet,
      olculmemisTutar: olculmemis.tutar,
      olcumAt: damga._min.kanalOlcumAt,
      yasSaat:
        damga._min.kanalOlcumAt === null
          ? null
          : (Date.now() - damga._min.kanalOlcumAt.getTime()) / 3_600_000,
      sonKosumBasarisiz: basarisiz,
      sonKosumMesaji: mesaj,
      /** ⛔ "İZ YOK" AYRI SÖYLENİR — "iz var ve temiz" ile aynı görünmesin. */
      kosumIziYok: sonIz === null,
    });
  }

  /** ⚠ EN ÇOK PARA HANGİ KANALDA YATIYORSA O ÜSTTE — satır sırasıyla aynı ölçüt. */
  kutular.sort((a, b) => b.toplamTutar - a.toplamTutar);
  return kutular;
}
