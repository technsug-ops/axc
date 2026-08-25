import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Geist } from "next/font/google";
import { BookOpen, Home } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { BasariBildirimi } from "@/components/basari-bildirimi";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OTURUM_CEREZI } from "@/lib/oturum-imza";
import { oturumdakiKullanici } from "@/lib/oturum";
import { menuDuzeni } from "@/lib/menu/okuma";
import { yetkiBaglami } from "@/lib/yetki";
import { BildirButonu } from "@/components/bildir-butonu";
import { SwKayit } from "@/components/sw-kayit";
import { TemaSecici } from "@/components/tema-secici";
import { KABUK_RENKLERI } from "@/lib/marka/renkler";
import { UyariCani } from "@/components/uyari-cani";
import { UYGULAMA } from "@/lib/uygulama";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

/**
 * ⚠ TEMA REACT'TEN ÖNCE UYGULANIR — yoksa sayfa bir kare AÇIK temada
 * çizilir, sonra karanlığa atlar (FOUC). Bu betik `<head>` içinde, hiçbir
 * şey boyanmadan koşar.
 *
 * ⚠ `try/catch` ŞART: gizli sekmede `localStorage` erişimi HATA FIRLATIR
 * (yalnız boş dönmez). Yakalanmazsa betik ölür ve tema hiç uygulanmaz.
 *
 * ⚠ VARSAYILAN KOBALT, ama cihaz karanlık istiyorsa GECE ile açılır:
 * kullanıcı hiç seçim yapmadıysa sistemin tercihi bir cevaptır, "hiç
 * cevap yok" değildir.
 *
 * ⚠ `.dark` SINIFI DA EKLENİR: durum renklerinin (`lib/renkler.ts`) koyu
 * varyantları Tailwind'in `dark:` önekiyle yazılı ve o önek `.dark`
 * atasına bakıyor. Yalnız `data-tema` yazsaydık yüzeyler kararır, yeşil
 * ve kırmızı rozetler açık tema tonunda kalırdı.
 *
 * ⚠ TELEFONUN SİSTEM ÇUBUĞU DA BURADA BOYANIR. PWA olarak açıldığında
 * üstteki saat/pil şeridi `<meta name="theme-color">` rengini alır. React
 * bunu sonra düzeltseydi kullanıcı her açılışta bir kare YANLIŞ renk
 * görürdü — koyu temada parlak mavi bir şerit. Meta etiketi betiğin
 * HEMEN ÜSTÜNDE duruyor ki betik onu bulabilsin.
 */
/**
 * ⚠ ÜÇÜNCÜ TEMA BURAYA DA YAZILIR (24.08.2026). Bu betik React yüklenmeden
 * ÖNCE koşuyor ve temayı `<html>`e basıyor. Adı tanımasaydı kağıt teması
 * seçili bir kullanıcı her açılışta kobalt görürdü — seçim kaydedilmiş
 * ama uygulanmamış olurdu.
 *
 * ⚠ KABUK RENGİ DE ÜÇE ÇIKTI: telefonun sistem çubuğu bu etiketten
 * okunuyor; eksik kalsaydı kağıt temasında çubuk lacivert kalırdı.
 */
const KABUK_JSON = JSON.stringify(KABUK_RENKLERI);
const TEMA_BETIGI = `(function(){var g=${KABUK_JSON};try{var t=localStorage.getItem("selliora-tema");if(!g[t]){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"gece":"kobalt";}var k=document.documentElement;k.setAttribute("data-tema",t);if(t==="gece"){k.classList.add("dark");}var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute("content",g[t]);}}catch(e){}})();`;

/**
 * Sekme başlıkları tek yerden yönetiliyor: alt sayfalar sadece kendi
 * başlığını yazar ("Ürünler"), uygulama adını şablon ekler.
 * Açıklama sözlükten gelir — ürün ADI çevrilmez, sloganı çevrilir.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Uygulama");

  return {
    title: {
      default: UYGULAMA.ad,
      template: `%s — ${UYGULAMA.ad}`,
    },
    description: t("slogan"),

    /**
     * ⚠ iOS MANİFESTİ OKUMAZ. iPhone'da "Ana Ekrana Ekle" davranışı bu üç
     * etiketten gelir; manifest'teki `display: "standalone"` iOS'ta hiçbir
     * şey yapmaz. Bunlar olmadan kısayol Safari'yi adres çubuğuyla açar ve
     * kullanıcı "kurulmamış" sanır.
     */
    appleWebApp: {
      capable: true,
      title: UYGULAMA.ad,
      /* `default`: sistem çubuğu kendi rengini korur ve yazısı okunur
         kalır. `black-translucent` içeriği çubuğun ALTINA sokar ve üst
         çubuğumuz saatin arkasında kalırdı. */
      statusBarStyle: "default",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const dil = await getLocale();
  const ortak = await getTranslations("Ortak");

  /**
   * İKİNCİ KAPI — İPTAL EDİLMİŞ OTURUMLAR.
   *
   * `proxy.ts` jetonun imzasına ve süresine bakar; veritabanına bakamaz
   * (her istekte çalışıyor). İptal buradan işler: kullanıcı pasife
   * alındıysa ya da parola değiştiği için `sessionVersion` arttıysa,
   * jeton hâlâ geçerli imzalı olsa bile içeri alınmaz.
   *
   * Çerez VARSA ama kullanıcı çözülemiyorsa → çerezi silen /cikis yoluna
   * gidilir. Çerez YOKSA hiçbir şey yapılmaz; giriş ekranı böyle çizilir
   * ve sonsuz yönlendirme oluşmaz.
   */
  const cerezler = await cookies();
  const oturumCerezi = cerezler.get(OTURUM_CEREZI)?.value;
  const kullanici = await oturumdakiKullanici().catch(() => null);

  /**
   * MENÜ DÜZENİ — SUNUCUDA ÇÖZÜLÜR (K51, 25.08.2026).
   *
   * ⚠ İSTEMCİDE ÇÖZÜLSEYDİ menü ilk boyamada varsayılan sırayla çizilir,
   * sonra kullanıcının sırasına ATLARDI: her sayfa açılışında gözle görülür
   * bir zıplama.
   *
   * ⚠ HATA MENÜYÜ DÜŞÜREMEZ — `menuDuzeni` kendi içinde geri çekiliyor ve
   * varsayılan düzenle dönüyor. Menü her sayfada çiziliyor; bir okuma
   * hatasının bütün uygulamayı 500'e düşürmesi kabul edilemez.
   */
  const baglam = kullanici ? await yetkiBaglami().catch(() => null) : null;
  const duzen = await menuDuzeni(baglam?.companyId ?? null);

  if (oturumCerezi && !kullanici) redirect("/cikis");

  /**
   * GİRİŞ YAPMAMIŞ KULLANICIYA KABUK GÖSTERİLMEZ.
   *
   * Menü, uygulamanın tüm yapısını (hangi ekranlar var, neler yönetiliyor)
   * ele verir. Giriş ekranında görünmesi hem bilgi sızdırır hem de kırık
   * durur: tıklanan her başlık aynı ekrana geri atardı.
   * _Kullanıcı 10.08.2026'da canlıda fark etti._
   */
  if (!kullanici) {
    return (
      <html
        lang={dil}
        className={cn("font-sans", geist.variable)}
        /* Tema betiği `data-tema` ve `.dark` ekliyor; sunucu çıktısıyla
           istemci ilk karesi bu yüzden AYRIŞIR ve bu beklenen hâldir. */
        suppressHydrationWarning
      >
        <head>
          {/* ⚠ BETİKTEN ÖNCE: yukarıdaki betik bu etiketi arayıp içeriğini
              temaya göre değiştiriyor. Sonra gelseydi bulamazdı. */}
          <meta name="theme-color" content={KABUK_RENKLERI.kobalt} />
          {/*
            ⚠ ESKİ iOS ETİKETİ — ELLE, ÇÜNKÜ NEXT BASMIYOR.

            `appleWebApp.capable` yalnız YENİ standardı basıyor
            (`mobile-web-app-capable`; ölçüldü:
            `node_modules/next/dist/lib/metadata/metadata.js:606`). Safari o
            adı geç tanıdı; ondan önceki sürümler SADECE aşağıdaki eski ada
            bakar ve bulamazsa kısayolu ADRES ÇUBUĞUYLA açar — yani "kurulmuş"
            görünmez.

            ⚠ BU YOL ÖLÇÜLMEDİ: elde iPhone yok (Halil testi 22.08.2026,
            madde 4 "denenemedi"). Etiketin kendisi bir iddia değil sigorta:
            gerekmediği sürümde etkisiz, gerektiği sürümde tek çare. Bir
            iPhone eline geçtiğinde ölçülecek (bkz. BEKLEYENLER → K30).
          */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <script dangerouslySetInnerHTML={{ __html: TEMA_BETIGI }} />
        </head>
        <body>
          {/* ⚠ GİRİŞ EKRANINDA DA KAYIT YAPILIR. Kullanıcı uygulamayı
              telefona kurmadan önce zaten giriş ekranını görüyor; kayıt
              yalnız içeride yapılsaydı "kur" teklifi ilk girişten sonra
              çıkardı ve çoğu kişi o anı kaçırırdı. Servis çalışanı veri
              taşımadığı için burada olması bir şey sızdırmaz. */}
          <SwKayit />
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </body>
      </html>
    );
  }

  return (
    <html
        lang={dil}
        className={cn("font-sans", geist.variable)}
        /* Tema betiği `data-tema` ve `.dark` ekliyor; sunucu çıktısıyla
           istemci ilk karesi bu yüzden AYRIŞIR ve bu beklenen hâldir. */
        suppressHydrationWarning
      >
        <head>
          {/* ⚠ BETİKTEN ÖNCE: yukarıdaki betik bu etiketi arayıp içeriğini
              temaya göre değiştiriyor. Sonra gelseydi bulamazdı. */}
          <meta name="theme-color" content={KABUK_RENKLERI.kobalt} />
          {/*
            ⚠ ESKİ iOS ETİKETİ — ELLE, ÇÜNKÜ NEXT BASMIYOR.

            `appleWebApp.capable` yalnız YENİ standardı basıyor
            (`mobile-web-app-capable`; ölçüldü:
            `node_modules/next/dist/lib/metadata/metadata.js:606`). Safari o
            adı geç tanıdı; ondan önceki sürümler SADECE aşağıdaki eski ada
            bakar ve bulamazsa kısayolu ADRES ÇUBUĞUYLA açar — yani "kurulmuş"
            görünmez.

            ⚠ BU YOL ÖLÇÜLMEDİ: elde iPhone yok (Halil testi 22.08.2026,
            madde 4 "denenemedi"). Etiketin kendisi bir iddia değil sigorta:
            gerekmediği sürümde etkisiz, gerektiği sürümde tek çare. Bir
            iPhone eline geçtiğinde ölçülecek (bkz. BEKLEYENLER → K30).
          */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <script dangerouslySetInnerHTML={{ __html: TEMA_BETIGI }} />
        </head>
      <body>
        <SwKayit />
        {/* Sözlük ve biçimler istemci bileşenlerine buradan akıyor. */}
        <NextIntlClientProvider>
          <TooltipProvider delayDuration={0}>
            <SidebarProvider>
              <AppSidebar eposta={kullanici.email} duzen={duzen} />
              {/*
                `min-w-0` ZORUNLU — yoksa SAYFA yana kayar.
                _Kullanıcı 14.08.2026'da canlıda yakaladı: /alimlar,
                /satislar ve /urunler ekranlarında pencerenin altında yatay
                kaydırma çubuğu çıkıyordu._

                Sebep: SidebarInset bir flex öğesi ve flex öğelerinin
                varsayılan `min-width` değeri `auto`'dur — yani içeriğinden
                DAHA KÜÇÜK olamaz. Geniş bir tablo öğeyi viewport'un dışına
                itiyor, kaydırma da tablonun kabında değil SAYFADA oluşuyor:
                menü ve üst çubuk dahil her şey kayıyor.

                `min-w-0` öğenin küçülmesine izin verir; böylece tablolar
                KENDİ `overflow-x-auto` kaplarında kayar — istenen davranış
                budur.
              */}
              <SidebarInset className="min-w-0">
                {/* ⚠ `data-kabuk` bir SÜS DEĞİL: globals.css'te bu çubuğa yerel
                    token devri bağlı (üst çubuk kabuk renginde). Kaldırılırsa
                    çubuk sessizce beyaza döner — bekçi bunu yakalıyor. */}
                <header
                  data-kabuk="ust"
                  className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-4 print:hidden"
                >
                  {/*
                    Menü tetikleyicisi.
                    shadcn varsayılanı size="icon-sm" (28px) ve variant="ghost"
                    (durağan halde görünmez). Telefonda bu hem çok küçük bir
                    dokunma hedefi (Android asgarisi 48dp) hem de görünmez bir
                    düğme. Mobilde 44px + çerçeveli, masaüstünde eski boyutunda.
                  */}
                  <SidebarTrigger
                    variant="outline"
                    aria-label={ortak("menuyuAc")}
                    className="size-11 shrink-0 md:size-8"
                  />
                  <Link
                    href="/"
                    className="hover:bg-accent inline-flex items-center gap-2 rounded-md px-2 py-2 font-semibold transition-colors"
                  >
                    <Home className="size-4" />
                    {UYGULAMA.ad}
                  </Link>
                  {/*
                    UYARI ÇANI — sağa yaslı, her ekranda görünür.
                    `ms-auto` ile: marka solda kalsın, çan sağ uçta dursun.
                    Kendi verisini bağlandıktan sonra çekiyor; kök layout'a
                    sorgu koymak uygulamadaki her sayfayı bekletirdi.
                  */}
                  <div className="ms-auto flex items-center gap-2">
                    {/* TEMA — Kobalt / Gece. Ayarlara gömülmedi: tema bir
                        AYAR değil TERCİHTİR ve gün içinde değişir. */}
                    <TemaSecici />
                    {/* EL KİTABI — üst çubukta kısayol (kullanıcı 22.08.2026).
                        Menüde de var ama menü kapalıyken ve mobilde görünmez;
                        oysa kılavuza tam olarak "bir şeyi bilmediğin anda"
                        ihtiyaç duyulur ve o an menüyü açıp aramak, kılavuza
                        hiç bakmamakla aynı kapıya çıkar (İlke #9: az tıkla).

                        ⚠ İKON TEK BAŞINA KONUŞMAZ (renk/ikon kısıtı): hem
                        `aria-label` hem ipucu var, ikisi de sözlükten. */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          className="size-11 shrink-0 md:size-8"
                        >
                          <Link href="/el-kitabi" aria-label={ortak("elKitabiKisayolu")}>
                            <BookOpen className="size-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{ortak("elKitabiKisayolu")}</TooltipContent>
                    </Tooltip>
                    {/* BİLDİR — her ekranda, izinsiz. Sorunun yaşandığı anda
                        bildirilmesi esas; menü zinciri kurulunca kimse
                        bildirmez ve bildirim Telegram'a kaçar. */}
                    <BildirButonu />
                    <UyariCani />
                  </div>
                </header>
                {/*
                  Burada <main> KULLANILMAZ: SidebarInset zaten <main> üretiyor,
                  iç içe main geçersiz HTML olur.
                */}
                {/*
                  `min-w-0` yukarıdakinin ikizi (bu da flex öğesi),
                  `overflow-x-clip` ise EMNİYET KEMERİ: yarın bir ekran
                  kendi kabına almadığı geniş bir öğe koyarsa sayfa yine
                  kaymaz, o öğe kırpılır. Kırpmak, tüm arayüzün yana
                  kaymasından iyidir — ama asıl çözüm her zaman geniş
                  içeriği kendi `overflow-x-auto` kabına koymaktır.
                  `clip` seçildi, `hidden` değil: `hidden` yeni bir kaydırma
                  bağlamı açar ve içteki `sticky` başlıkları bozar.
                */}
                <div className="min-w-0 flex-1 overflow-x-clip p-4 md:p-6 print:p-0">
                  {/* Basari mesaji TEK YERDE: her ekranda ayni yerde,
                      ayni gorunumde cikar (Kullanici Kolayligi #10). */}
                  <BasariBildirimi />
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
