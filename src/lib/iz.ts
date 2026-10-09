import { prisma, sistemPrisma } from "@/lib/prisma";
import { aktifFirmaKimligi } from "@/lib/firma-baglami";
import { yetkiBaglami } from "@/lib/yetki";

/**
 * ============================================================================
 *  DEFTER İZİ — "KİM" SORUSUNU DA CEVAPLAR (K90, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DOĞDU: K90 ölçümünde `AuditLog.userId` sistemde **HİÇBİR** izde
 *  dolu çıkmadı. İzler "ne · eski/yeni · neden · ne zaman" diyordu ama
 *  **"kim"** demiyordu — ve üç ay sonra "bu maliyeti kim değiştirmiş"
 *  sorusunun cevabı yoktu. Alan şemada VARDI; yazıcısı yoktu.
 *  _(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur".)_
 *
 *  ⭐ ÇARE 32 ÇAĞRI YERİNİ TEK TEK DÜZELTMEK DEĞİL, MEKANİZMA: iz bu
 *  gövdeden geçer ve kullanıcıyı KENDİSİ damgalar. 33'üncü çağrı yerini
 *  yazan kişinin hatırlaması gerekmez.
 *  _(Anayasa: "güvenlik mekanizmaya bağlanır, insan disiplinine değil".)_
 *
 *  ── ⚠ OTURUMSUZ YAZIM MEŞRUDUR VE SESSİZ GEÇMEZ ─────────────────────
 *  Bazı izler oturum DIŞINDA doğuyor: gece koşumu, içe aktarma betiği, cron
 *  ucu. Orada `userId` boş kalır — bu bir kusur değil, doğru cevaptır
 *  ("bunu bir insan yapmadı"). Ama uydurma bir kullanıcı da yazılmaz.
 * ============================================================================
 */

/**
 * `prisma` ya da işlem içindeki `tx` — ikisi de kabul edilir.
 *
 * ⚠ TİP PRISMA'NIN KENDİ İMZASINDAN TÜRETİLİYOR, ELLE YAZILMIYOR: elle
 * yazılan gevşek bir imza (`Record<string, unknown>`) alan adı yanlış
 * yazıldığında sessizce geçerdi.
 */
type Istemci = Pick<typeof prisma, "auditLog">;

export type IzVerisi = {
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
  /**
   * ⚠ AÇIKÇA VERİLEN KULLANICI — OTURUMU EZER. Bazı gövdeler (`satis-iptali`,
   * `komisyon/yukleme-kaydi` …) kullanıcıyı ÇAĞIRANDAN alıyor çünkü hem
   * ekrandan hem betikten koşuyorlar. Orada oturuma bakmak yanlış olurdu:
   * betikte oturum yok, ama işi başlatan kişi belli.
   *
   * ⛔ `null` VERMEK "OTURUMA BAKMA, KİMSE YOK" DEMEKTİR — `undefined` ise
   * "oturuma bak". İkisi ayrı; tek değere indirilseydi cron izleri
   * sessizce oturum arardı.
   */
  userId?: string | null;
  /**
   * ⚠ FİRMA — çok-kiracılığa hazırlık. Bazı izler firmaya bağlı doğuyor
   * (komisyon yüklemesi gibi); alan şemada var, gövde onu taşımadığı için
   * dışarıda kalıyordu.
   */
  companyId?: string | null;
};

/**
 * OTURUMDAKİ KULLANICI — YOKSA `null`, UYDURULMAZ.
 *
 * ⚠ İSTEK BAĞLAMI DIŞINDA `yetkiBaglami()` ÇÖKER (çerez okunamaz). Betik ve
 * cron yolları tam olarak orada; hata yutulmuyor, "oturum yok" olarak
 * OKUNUYOR ve iz `userId` boş yazılıyor.
 */
export async function izKullanicisi(): Promise<string | null> {
  try {
    const baglam = await yetkiBaglami();
    return baglam?.kullaniciId ?? null;
  } catch {
    return null;
  }
}

/**
 * İZ YAZ — `userId` KENDİLİĞİNDEN DAMGALANIR.
 *
 * ⚠ İŞLEM İÇİNDE ÇAĞRILIYORSA `tx` VERİLİR: iz ile yazımın aynı işlemde
 * olması gerekiyor, yoksa yazım geri alınıp iz kalabilir.
 */
/**
 * ⚠ YAZILAN İZİN KİMLİĞİ DÖNER. Bir çağıran (okuma akışı) o kimliği geri
 * alma bağlantısı için kullanıyor; dönmeseydi orası tek başına çıplak
 * `auditLog.create` yazmak zorunda kalır ve "kim" damgası yine elle
 * taşınırdı. Kullanmayan çağıran görmezden gelir.
 */
export async function izYaz(
  veri: IzVerisi,
  istemci?: Istemci,
): Promise<string> {
  const userId =
    veri.userId === undefined ? await izKullanicisi() : veri.userId;
  /**
   * K303: firma süzgeçli istemci izi aktif firmaya bağlar. Firma bağlamı YOKSA
   * (yalnız oturum açılmadan önce: hatalı giriş denemesi) iz firmasız yazılır.
   * SISTEM: girişten önce firma yoktur; bu dal süzgeci atlar, başka yol açmaz.
   */
  const hedef = istemci ?? ((await aktifFirmaKimligi()) ? prisma : sistemPrisma);
  const satir = await hedef.auditLog.create({
    data: {
      action: veri.action,
      userId,
      companyId: veri.companyId ?? null,
      targetType: veri.targetType ?? null,
      targetId: veri.targetId ?? null,
      detail: veri.detail ?? null,
    },
    select: { id: true },
  });
  return satir.id;
}

/**
 * ============================================================================
 *  İZ KAYDI — TOPLU İŞLEM DİZİSİNE GİREN GİRİŞ (09.10.2026)
 * ----------------------------------------------------------------------------
 *  `izYaz` async: kullanıcıyı oturumdan çözer ve yazımı HEMEN başlatır; bu
 *  yüzden `$transaction([a, b, iz])` dizisine konamaz. Sekiz K303 gövdesi bu
 *  yüzden iz satırını çıplak `auditLog.create` ile yazıyordu (`iz:dogrula`
 *  dalın ilk tam turunda yakaladı). Bu giriş aynı satırı TEMBEL (PrismaPromise)
 *  döndürür: diziye girer, işlem yürütünce yazılır — iz yine TEK dosyadan.
 *
 *  ⚠ `userId` ZORUNLU ve AÇIK (`null` = bunu bir insan yapmadı): dizi içinde
 *  oturuma bakılamaz. `companyId` YALNIZ VERİLDİYSE yazılır — verilmezse
 *  firma süzgeçli istemcide süzgeç ekler (çıplak yazımların davranışı aynen).
 * ============================================================================
 */
export function izKaydi(istemci: Istemci, veri: IzVerisi & { userId: string | null }) {
  return istemci.auditLog.create({
    data: {
      action: veri.action,
      userId: veri.userId,
      ...(veri.companyId !== undefined ? { companyId: veri.companyId } : {}),
      targetType: veri.targetType ?? null,
      targetId: veri.targetId ?? null,
      detail: veri.detail ?? null,
    },
  });
}
