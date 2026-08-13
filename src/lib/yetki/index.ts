import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { oturumdakiKullanici } from "@/lib/oturum";

import { izinTaninirMi, type Izin } from "./izinler";

/**
 * ============================================================================
 *  YETKİ MOTORU
 * ----------------------------------------------------------------------------
 *  ÜÇ KATMAN, ÜÇÜ DE ZORUNLU:
 *    1. proxy.ts   — giriş var mı (zaten vardı, veritabanına gitmez)
 *    2. SAYFA      — bu rol bu sayfayı görebilir mi
 *    3. HER ACTION — bu rol bu işlemi yapabilir mi   <- ASIL KİLİT
 *
 *  MENÜ GİZLEMEK YETKİ DEĞİLDİR. Menüden kaldırılan bir sayfaya adres
 *  çubuğuna yazarak girilebilir; korunmayan bir action'a istek elle
 *  kurularak gönderilebilir. İstemciye ASLA güvenilmez.
 *
 *  PERFORMANS — ölçüldü, ek maliyet yok:
 *  `oturumdakiKullanici()` zaten her istekte veritabanına gidiyordu
 *  (kullanıcı aktif mi, sessionVersion tutuyor mu). İzinler AYNI istekte,
 *  tek ek sorguyla çözülüyor ve React `cache()` ile istek boyunca
 *  tekrarlanmıyor: bir sayfada 10 action olsa bile sorgu bir kez atılır.
 *
 *  OTURUMDA ROL TAŞINMAZ (kullanıcı kararı 13.08.2026): jetonda yalnız
 *  userId var. Rol veya izin değişikliği BİR SONRAKİ İSTEKTE etkilidir —
 *  yeniden giriş gerekmez. Rolü jetona gömseydik, yetkisi alınan bir
 *  kullanıcı jetonu dolana kadar (30 gün) yetkili kalırdı.
 * ============================================================================
 */

export type YetkiBaglami = {
  kullaniciId: string;
  eposta: string;
  ad: string | null;
  companyId: string;
  rolAdi: string;
  izinler: ReadonlySet<Izin>;
};

/**
 * Oturumdaki kullanıcının yetki bağlamı. Giriş yoksa ya da üyelik yoksa null.
 *
 * `cache()`: aynı istek içinde kaç kez çağrılırsa çağrılsın veritabanına
 * BİR kez gidilir. Sayfa + içindeki action + bileşenler aynı sonucu paylaşır.
 */
export const yetkiBaglami = cache(async (): Promise<YetkiBaglami | null> => {
  const kullanici = await oturumdakiKullanici();
  if (!kullanici) return null;

  // ÜYELİK: bugün tek firma, o yüzden ilk üyelik alınıyor. Çok firmaya
  // geçildiğinde burası oturumdaki aktifCompanyId'ye bakacak — çağıran
  // taraflar değişmeyecek.
  const uyelik = await prisma.userCompanyRole.findFirst({
    where: { userId: kullanici.id, company: { isActive: true } },
    select: {
      companyId: true,
      role: {
        select: {
          name: true,
          isActive: true,
          izinler: { select: { permissionKey: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // ÜYELİĞİ YOKSA YETKİSİ DE YOK. Giriş yapabilir ama hiçbir sayfayı
  // göremez — "kullanıcı var ama rolü yok" durumu sessizce tam yetkiye
  // dönüşmemeli.
  if (!uyelik) return null;
  // Rol pasife alındıysa izinleri de düşer.
  if (!uyelik.role.isActive) return null;

  // TANINMAYAN ANAHTAR YOK SAYILIR: veritabanına elle yazılmış ya da
  // kaldırılmış bir izin adı yetki VERMEZ. `yetki:dogrula` bunları
  // ayrıca bildirir.
  const izinler = new Set<Izin>();
  for (const i of uyelik.role.izinler) {
    if (izinTaninirMi(i.permissionKey)) izinler.add(i.permissionKey);
  }

  return {
    kullaniciId: kullanici.id,
    eposta: kullanici.email,
    ad: kullanici.ad,
    companyId: uyelik.companyId,
    rolAdi: uyelik.role.name,
    izinler,
  };
});

/** Bu izin var mı? Giriş yoksa false. */
export async function izinVarMi(izin: Izin): Promise<boolean> {
  const baglam = await yetkiBaglami();
  return baglam?.izinler.has(izin) ?? false;
}

/**
 * Yetkisiz erişim. Sayfada `notFound()`, action'da bu hata fırlatılır.
 *
 * NEDEN 404 DEĞİL DE HATA: sayfa tarafında `notFound()` kullanıyoruz —
 * "bu sayfa yok" demek, "var ama giremezsin" demekten daha az bilgi
 * sızdırır. Action tarafında ise çağıran taraf hatayı yakalayıp kullanıcıya
 * anlaşılır bir mesaj göstermeli.
 */
export class YetkisizHata extends Error {
  constructor(readonly izin: Izin) {
    super(`YETKISIZ:${izin}`);
    this.name = "YetkisizHata";
  }
}

/**
 * ACTION KORUMASI — her server action'ın İLK satırı.
 *
 *     export async function alimOlustur(...) {
 *       await yetkiIste("alim.yaz");
 *       ...
 *     }
 *
 * `yetki:dogrula` korumasız action kalıp kalmadığını denetler.
 */
export async function yetkiIste(izin: Izin): Promise<YetkiBaglami> {
  const baglam = await yetkiBaglami();
  if (!baglam || !baglam.izinler.has(izin)) throw new YetkisizHata(izin);
  return baglam;
}

/**
 * SAYFA KORUMASI — her korumalı sayfanın ilk satırı.
 *
 *     export default async function AlimlarSayfasi() {
 *       await sayfaIzni("alim.gor");
 *       ...
 *     }
 *
 * YETKİSİZDE `notFound()`: "bu sayfa yok" demek, "var ama giremezsin"
 * demekten daha az bilgi sızdırır. Kullanıcı zaten menüde görmüyor;
 * adresi elle yazan biri de sistemin yapısını öğrenmemeli.
 */
export async function sayfaIzni(izin: Izin): Promise<YetkiBaglami> {
  // PAROLA DEĞİŞTİRME ZORUNLUYSA HİÇBİR SAYFA AÇILMAZ. Sahip parolayı
  // belirledi; kullanıcı kendi parolasını koymadan sistemde dolaşmamalı.
  // Kontrol burada çünkü her korumalı sayfa buradan geçiyor — tek yer.
  if (await parolaDegismeliMi()) redirect("/parola-degistir");

  const baglam = await yetkiBaglami();
  if (!baglam || !baglam.izinler.has(izin)) notFound();
  return baglam;
}

/** Oturumdaki kullanıcı ilk parolasını değiştirmek zorunda mı? */
export const parolaDegismeliMi = cache(async (): Promise<boolean> => {
  const kullanici = await oturumdakiKullanici();
  if (!kullanici) return false;
  const kayit = await prisma.user.findUnique({
    where: { id: kullanici.id },
    select: { mustChangePassword: true },
  });
  return kayit?.mustChangePassword ?? false;
});

/**
 * API UCU KORUMASI — her route handler'ın ilk satırı.
 *
 *     export async function GET(istek: Request) {
 *       const red = await apiIzni("veri.aktar");
 *       if (red) return red;
 *       ...
 *     }
 *
 * NEDEN AYRI: sayfada `notFound()`, action'da hata fırlatılıyor. API'de
 * ikisi de yanlış — makine okunur bir yanıt gerekir.
 *
 * 13.08.2026'DA BULUNDU: 10 API ucunun HİÇBİRİNDE yetki kontrolü yoktu.
 * Yalnız `proxy.ts` giriş arıyordu, yani GİRİŞİ OLAN HERKES `/api/yedek`
 * ile tüm veritabanını indirebiliyor, `/api/geri-yukle/uygula` ile
 * silebiliyordu. Bekçi yalnız sayfa ve action tarıyordu — kör noktasıydı.
 * Bekçiye API bölümü eklendi.
 */
export async function apiIzni(izin: Izin): Promise<Response | null> {
  const baglam = await yetkiBaglami();
  if (baglam?.izinler.has(izin)) return null;
  return Response.json({ durum: "YETKISIZ", izin }, { status: 403 });
}
