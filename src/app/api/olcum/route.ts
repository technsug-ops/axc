import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  ÖLÇÜM UCU — SALT OKUMA (A3 / K50-a)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR — VE NİYE YEREL BETİK YERİNE BURADA:
 *  Yerel makineden canlı veritabanına bağlanılamıyor. Teşhis edildi
 *  (25.08.2026), ve sebep havuz ayarı DEĞİL: TCP seviyesinde
 *  `ECONNREFUSED 85.13.128.135:3306` — sunucu bağlantıyı **aktif olarak
 *  reddediyor**. KAS'ta uzak MySQL erişimi IP listesine bağlı ve bizim IP
 *  listede değil. Prisma'nın `connection_limit`/`pool_timeout` ayarlarıyla
 *  oynamak bu hatayı ÇÖZEMEZDİ; ölçüm o yolu daha açılmadan kapattı.
 *
 *  Vercel'in çıkış IP'si listede (canlı site çalışıyor). Yani ölçüm
 *  canlının KENDİ havuzundan koşarsa yerel yol devre dışı kalır.
 *
 *  ⚠ SALT OKUMA — bu dosyada tek bir yazma çağrısı YOKTUR ve olmayacak.
 *  `api:dogrula` bunu sınıyor: kendini "SALT OKUMA" diye beyan eden bir
 *  API dosyasında `prisma.create/update/delete` geçerse KIRMIZI.
 *
 *  ⚠ KORUMASIZ UÇ AÇIK BIRAKILMAZ. Sır tanımlı değilse uç KAPALI döner —
 *  `api/yedek/otomatik` ile aynı disiplin. Mevcut `CRON_SECRET` yeniden
 *  kullanılıyor: ikinci bir sır, ikinci bir kaybolma yeri demekti.
 *
 *  ⚠ MÜŞTERİ VERİSİ DÖNMEZ. Sayımlar, raf kodları ve ürün adları —
 *  alıcı adı, adres, telefon hiçbir alanda yok.
 *
 *  KOŞUM:
 *    curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/olcum
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/** Raf kodu şablonu — K50 kararı (a). */
const SABLON = /^RAF-[A-Z0-9]+\d+-\d+$/;

export async function GET(istek: Request) {
  const sir = process.env.CRON_SECRET;
  if (!sir) {
    return Response.json(
      {
        durum: "KAPALI",
        mesaj:
          "CRON_SECRET tanımlı değil. Ölçüm ucu bilerek kapalı — korumasız bir uç açık bırakılmaz.",
      },
      { status: 503 },
    );
  }
  if (istek.headers.get("authorization") !== `Bearer ${sir}`) {
    return Response.json({ durum: "YETKISIZ" }, { status: 401 });
  }

  const okumaAni = new Date().toISOString();

  /* ── K50-a① · RAF DOLULUĞU ──────────────────────────────────────────── */
  const aktifVaryant = await prisma.productVariant.count({ where: { isActive: true } });
  const rafli = await prisma.productVariant.count({
    where: { isActive: true, locationId: { not: null } },
  });
  const konumlar = await prisma.location.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      _count: { select: { variants: true } },
    },
    orderBy: { code: "asc" },
  });

  /* ── K50-a② · 41 ADIN BİÇİMİ ────────────────────────────────────────── */
  const bicim = konumlar.map((k) => ({
    kod: k.code,
    ad: k.name,
    aktif: k.isActive,
    varyant: k._count.variants,
    sablonaUyuyor: SABLON.test(k.code),
    /** ⚠ Barkod-güvenliği: boşluk · Türkçe karakter · küçük harf ayrı sayılır. */
    bosluk: /\s/.test(k.code),
    turkceKarakter: /[çğıöşüÇĞİÖŞÜ]/.test(k.code),
    kucukHarf: /[a-z]/.test(k.code),
    uzunluk: k.code.length,
  }));

  /* ── SINIR KIYASI · API'nin 0 döndüğü pencerelerde BİZDE satış var mı ── */
  const gun = 86_400_000;
  const simdi = Date.now();
  const pencere = async (ad: string, gerileBas: number, gerileSon: number) => {
    const bas = new Date(simdi - gerileBas * gun);
    const son = new Date(simdi - gerileSon * gun);
    const adet = await prisma.sale.count({
      where: { soldAt: { gte: bas, lt: son }, iptalTarihi: null },
    });
    return { ad, bas: bas.toISOString(), son: son.toISOString(), bizdekiSatis: adet };
  };

  const kiyas = [
    await pencere("6 ay öncesi (API 0 döndü)", 180, 166),
    await pencere("son 180 gün (API 0 döndü)", 180, 0),
    await pencere("3 ay öncesi (API 105 döndü)", 90, 76),
    await pencere("son 90 gün (API 105 döndü)", 90, 0),
  ];

  /** Defterin en eski satışı — kıyasın tabanı. */
  const enEski = await prisma.sale.findFirst({
    where: { iptalTarihi: null },
    orderBy: { soldAt: "asc" },
    select: { soldAt: true, code: true },
  });

  return Response.json({
    durum: "OK",
    okumaAni,
    uyari:
      "SALT OKUMA. Bu uç hiçbir kayıt yazmaz. Rakamlar okuma anına aittir; defter akmaya devam eder.",

    rafDolulugu: {
      aktifVaryant,
      rafli,
      rafsiz: aktifVaryant - rafli,
      yuzde: aktifVaryant > 0 ? Number(((rafli / aktifVaryant) * 100).toFixed(1)) : null,
      tanimliRaf: konumlar.length,
      /** ⚠ Boş raf da sayılır: silme kuralı (yalnız boşsa) buna bakacak. */
      bosRaf: konumlar.filter((k) => k._count.variants === 0).length,
      enKalabalik10: [...konumlar]
        .sort((a, b) => b._count.variants - a._count.variants)
        .slice(0, 10)
        .map((k) => ({ kod: k.code, ad: k.name, varyant: k._count.variants })),
    },

    adBicimi: {
      toplam: bicim.length,
      sablonaUyan: bicim.filter((b) => b.sablonaUyuyor).length,
      uymayan: bicim.filter((b) => !b.sablonaUyuyor).length,
      bosluklu: bicim.filter((b) => b.bosluk).length,
      turkceKarakterli: bicim.filter((b) => b.turkceKarakter).length,
      kucukHarfli: bicim.filter((b) => b.kucukHarf).length,
      /** ⚠ TAM LİSTE — göç tablosu bunun üstüne kurulacak, özet yetmez. */
      hepsi: bicim,
    },

    sinirKiyasi: {
      not:
        "API'nin 0 kayıt döndüğü pencerelerde BİZDE satış varsa, pencere sessizce KIRPILMIŞ demektir. Yoksa 0 gerçekten veri yokluğudur.",
      enEskiSatis: enEski
        ? { kod: enEski.code, tarih: enEski.soldAt.toISOString() }
        : null,
      pencereler: kiyas,
    },
  });
}
