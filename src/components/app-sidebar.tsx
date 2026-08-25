"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Banknote,
  ChevronDown,
  BookOpen,
  MessageSquarePlus,
  Boxes,
  CalendarClock,
  ClipboardList,
  Coins,
  Calculator,
  CreditCard,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  MapPin,
  Package,
  PackageX,
  Undo2,
  Percent,
  Receipt,
  ScanBarcode,
  PackageCheck,
  ScanSearch,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Tags,
  Warehouse,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CikisButonu } from "@/components/cikis-butonu";
import { UYGULAMA } from "@/lib/uygulama";

/**
 * Sol menü.
 *
 * Faz 1'de sadece "Ürünler" ve "Raf Konumları" aktif. Diğer başlıklar
 * bilerek pasif duruyor — nereye gittiğimizi göstermek için görünürler
 * ama tıklanamazlar. Faz sırası CLAUDE.md'de tanımlı.
 */

type MenuOgesi = {
  /** Menu sozlugundeki anahtar; etiket cizim aninda cozulur. */
  anahtar: string;
  href: string;
  icon: typeof Package;
  aktif: boolean;
};

/**
 * ── MENÜ DÜZENİ: ÖLÇÜT "TEMA" DEĞİL, GİTME SIKLIĞI ──────────────────────
 *
 * Kullanıcı 22.08.2026: _"menü bardakilerin bir kısmı devamlı görünür, bir
 * kısmı ise dropdown ile bir kategorinin altına alınabilir."_
 *
 * ⚠ ÖNCE SIKLIK, SONRA TEMA. Menü 30 öğeye çıkmıştı ve "Operasyon" grubu
 * 17'sini birden kapsadığı için aslında GRUPLAMIYORDU. Konuya göre bölmek
 * düzenli görünür ama asıl maliyet GÜNDE KAÇ TIK: bir açılır menü bir tık
 * demek — haftada bir gidilen yer için bedava, günde beş kez gidilen yer
 * için ceza. Bu yüzden önce sıklığa bölündü, tema her kutunun İÇİNDE
 * sıralamayı belirliyor.
 *
 * Sonuç: 30 satır → 7 satır + 4 başlık.
 */
const GUNLUK: MenuOgesi[] = [
  { anahtar: "panel", href: "/", icon: LayoutDashboard, aktif: true },
  { anahtar: "alimlar", href: "/alimlar", icon: ShoppingCart, aktif: true },
  { anahtar: "satislar", href: "/satislar", icon: Receipt, aktif: true },
  /*
    ⚠ SATIŞIN HEMEN ALTINDA — KULLANICI KARARI 25.08.2026.

    Önce "Barkod okut"un altında, "Ürün ve kanal" grubundaydı; gerekçe
    _"ikisi aynı refleks"_ idi. Kullanıcı gününü anlattı ve gerekçe düştü:
    paketleme SATIŞIN devamıdır — sipariş girilir, sonra kutu hazırlanır.
    Menü, ekranların BENZERLİĞİNE göre değil İŞİN SIRASINA göre dizilir.

    ⚠ Köprü bu taşımadan etkilenmez: `/okut`taki "Yönlendirmeli paketle"
    düğmesi menüden bağımsız, doğrudan adrese gider.
  */
  { anahtar: "paketle", href: "/paketle", icon: PackageCheck, aktif: true },
  { anahtar: "stok", href: "/stok", icon: Boxes, aktif: true },
  { anahtar: "iadeler", href: "/iadeler", icon: Undo2, aktif: true },
  /**
   * KÂRLILIK KARTI ve FİYAT DENEMESİ — mağazada telefonla barkod okutup
   * alım kararı verilen an. İkisi aynı ana ait: "elimde ürün var, alayım
   * mı" ve "alırsam nereye koyayım". Açılır menüye girselerdi o an bir tık
   * daha eklenirdi ve karar anı en çok tıkla en çok bozulan andır.
   */
  { anahtar: "urunKarti", href: "/kart", icon: ScanBarcode, aktif: true },
  { anahtar: "simulasyon", href: "/simulasyon", icon: Calculator, aktif: true },
];

type MenuGrubu = {
  /** Menü sözlüğündeki başlık anahtarı. */
  anahtar: string;
  ogeler: MenuOgesi[];
};

const GRUPLAR: MenuGrubu[] = [
  {
    anahtar: "grupPara",
    ogeler: [
      { anahtar: "giderler", href: "/giderler", icon: Wallet, aktif: true },
      { anahtar: "kartlar", href: "/kartlar", icon: CreditCard, aktif: true },
      { anahtar: "kartBorcu", href: "/kart-borcu", icon: Landmark, aktif: true },
      { anahtar: "hakedis", href: "/hakedis", icon: Banknote, aktif: true },
      { anahtar: "tazminat", href: "/tazminat", icon: PackageX, aktif: true },
      {
        anahtar: "nakitTakvimi",
        href: "/nakit-takvimi",
        icon: CalendarClock,
        aktif: true,
      },
      { anahtar: "rapor", href: "/rapor", icon: BarChart3, aktif: true },
    ],
  },
  {
    anahtar: "grupUrunKanal",
    ogeler: [
      { anahtar: "urunler", href: "/urunler", icon: Package, aktif: true },
      /**
       * BARKOD OKUT (K34a) — GRUPTA, GÜNLÜK LİSTEDE DEĞİL.
       *
       * ⚠ SIKLIĞA GÖRE GÜNLÜK LİSTEYE AİT: depoda paket başına en az bir kez
       * açılıyor (~30/gün, hedef 150). Ama hep açık liste kullanıcının
       * ONAYLADIĞI YEDİ satır (22.08.2026) ve bir bekçi bunu sabitliyor.
       * Sekizinciyi eklemek, kullanıcının verdiği bir kararı kendi işime
       * uydurmak olurdu — eşiği soruyu soran koyamaz.
       *
       * Bu yüzden şimdilik grupta duruyor ve takas kullanıcıya SORULDU:
       * `okut`, `urunKarti`/`simulasyon`dan daha sık açılan bir ekran.
       * Karar gelirse tek satırlık iş.
       */
      { anahtar: "okut", href: "/okut", icon: ScanSearch, aktif: true },
      { anahtar: "kanalSkulari", href: "/kanal-sku", icon: Tags, aktif: true },
      {
        anahtar: "kanalHesaplari",
        href: "/ayarlar/kanallar",
        icon: Store,
        aktif: true,
      },
      {
        anahtar: "envanterDegeri",
        href: "/envanter-degeri",
        icon: Coins,
        aktif: true,
      },
    ],
  },
  {
    anahtar: "grupTanimlar",
    ogeler: [
      {
        /*
          ⚠ DEPO KURULUMU, RAF KONUMLARININ ÜSTÜNDE — İŞİN SIRASI.
          Önce depo çizilir (bölüm/ünite/göz → kodlar üretilir), sonra
          tek tek konumlar yönetilir. Menü işin sırasına göre dizilir.
        */
        anahtar: "depoKurulumu",
        href: "/ayarlar/depo",
        icon: Warehouse,
        aktif: true,
      },
      {
        anahtar: "rafKonumlari",
        href: "/ayarlar/konumlar",
        icon: MapPin,
        aktif: true,
      },
      {
        anahtar: "kategoriler",
        href: "/ayarlar/kategoriler",
        icon: Percent,
        aktif: true,
      },
      {
        anahtar: "duzeltmeNedenleri",
        href: "/ayarlar/duzeltme-nedenleri",
        icon: ClipboardList,
        aktif: true,
      },
      {
        anahtar: "tedarikciler",
        href: "/ayarlar/tedarikciler",
        icon: Truck,
        aktif: true,
      },
      {
        anahtar: "kullanicilar",
        href: "/ayarlar/kullanicilar",
        icon: Users,
        aktif: true,
      },
      { anahtar: "roller", href: "/ayarlar/roller", icon: ShieldCheck, aktif: true },
    ],
  },
  {
    anahtar: "grupVeri",
    ogeler: [
      {
        anahtar: "veriAktarimi",
        href: "/ayarlar/ice-aktarma",
        icon: FileSpreadsheet,
        aktif: true,
      },
      {
        anahtar: "veriDisari",
        href: "/ayarlar/disa-aktarma",
        icon: Download,
        aktif: true,
      },
      {
        anahtar: "geriYukleme",
        href: "/ayarlar/geri-yukleme",
        icon: DatabaseBackup,
        aktif: true,
      },
      {
        anahtar: "gecmisEkstre",
        href: "/ayarlar/gecmis-ekstre",
        icon: FileSpreadsheet,
        aktif: true,
      },
      {
        anahtar: "tarife",
        href: "/ayarlar/tarife",
        icon: Percent,
        aktif: true,
      },
    ],
  },
];

/** En altta sabit — her zaman erişilebilir, hiçbir grubun içinde değil. */
const ALT: MenuOgesi[] = [
  { anahtar: "elKitabi", href: "/el-kitabi", icon: BookOpen, aktif: true },
  {
    anahtar: "talepler",
    href: "/talepler",
    icon: MessageSquarePlus,
    aktif: true,
  },
];

/**
 * ── AÇIK GRUPLAR TARAYICIDA HATIRLANIR ──────────────────────────────────
 *
 * ⚠ HER SAYFA GEÇİŞİNDE KAPANAN MENÜ, AÇILIR MENÜ OLMAKTAN ÇIKIP ENGELE
 * DÖNER. Kullanıcı "Para"yı açar, hakedişe gider, geri döner ve yine kapalı
 * bulur — üçüncü seferde menüye küser.
 *
 * ⚠ REACT DURUMU DEĞİL DIŞ KAYNAK. Tercih tarayıcıya ait ve sunucu bilmez;
 * `useSyncExternalStore` tam bu iş için. `useEffect` + `setState` hem lint
 * tarafından reddediliyor hem de yanlış mimari olurdu.
 */
const MENU_ANAHTARI = "selliora-menu-acik";
const MENU_OLAYI = "selliora-menu-degisti";

function menuAbone(geriCagir: () => void): () => void {
  window.addEventListener(MENU_OLAYI, geriCagir);
  window.addEventListener("storage", geriCagir);
  return () => {
    window.removeEventListener(MENU_OLAYI, geriCagir);
    window.removeEventListener("storage", geriCagir);
  };
}

/** ⚠ DİZE DÖNER, dizi değil: `useSyncExternalStore` anlık görüntüyü
 *  değere göre karşılaştırır; her çağrıda yeni dizi dönseydi sonsuz
 *  render olurdu. */
/**
 * ⚠ BELLEK YEDEĞİ — MENÜ DEPOLAMAYA BAĞIMLI OLAMAZ (canlı bulgu 25.08.2026).
 *
 * Kullanıcı: _"para kategorisi açılıp kapanmıyor."_ Sebep şuydu: durum
 * YALNIZ `localStorage`ta yaşıyordu ve yazma bir sebeple başarısız olursa
 * (gizli sekme · site verisi engeli · kota) `catch {}` onu SESSİZCE
 * yutuyordu. Okuma hep "" dönüyor, hiçbir grup açılmıyor ve düğme
 * bozukmuş gibi görünüyordu.
 *
 * ⚠ ÇARE: gerçeğin kaynağı BELLEK, depolama yalnız KALICILIK. Depolama
 * çalışmıyorsa menü o oturum boyunca yine de çalışır — tercih sekme
 * kapanınca unutulur, ama bu "hiç çalışmamak"tan kat kat iyidir.
 */
let bellekteki: string | null = null;

function menuOku(): string {
  if (bellekteki !== null) return bellekteki;
  try {
    return localStorage.getItem(MENU_ANAHTARI) ?? "";
  } catch {
    return "";
  }
}

/** Belleğe HER ZAMAN yazar; depolama isteğe bağlıdır. */
function menuYaz(deger: string): void {
  bellekteki = deger;
  try {
    localStorage.setItem(MENU_ANAHTARI, deger);
  } catch {
    /* Kalıcılık yok — menü yine çalışır, tercih sekmeyle sınırlı kalır. */
  }
}

/** Sunucuda tercih bilinmez; aktif grup zaten yoldan hesaplanıyor. */
const menuSunucu = (): string => "";

export function AppSidebar({ eposta }: { eposta?: string }) {
  const pathname = usePathname();
  const t = useTranslations("Uygulama");
  const tMenu = useTranslations("Menu");

  const kayitli = useSyncExternalStore(menuAbone, menuOku, menuSunucu);
  /**
   * ÜÇ DURUM: kayıt yok (otomatik) · AÇIKÇA açık · AÇIKÇA kapalı.
   *
   * ⚠ NİYE ÜÇ (canlı bulgu 25.08.2026): önce yalnız "açık" kaydı vardı ve
   * açık sayfanın grubu ZORLA açık tutuluyordu (`icindeSecili || …`).
   * Sonuç: kullanıcı `/ayarlar/...` sayfalarındayken "Tanımlar" başlığına
   * basıyor ve HİÇBİR ŞEY OLMUYOR — grup kapanmıyordu. Tıklanınca bir şey
   * yapmayan düğme, sessiz başarısızlıktır (İlke #5).
   *
   * ⚠ VE OTOMATİK AÇILMA KALDIRILMADI, YALNIZ AÇIK BİR TERCİHE YENİLİYOR.
   * Gerekçesi hâlâ geçerli: bulunduğun sayfayı menüde görememek
   * "kayboldum" duygusu üretir. Ama kullanıcı BİLEREK kapattıysa o karar
   * kazanır — tercih, varsayılanın üstündedir.
   *
   * ⚠ Depolama biçimi geriye uyumlu: `-` öneki AÇIKÇA KAPALI demek.
   * Eski kayıtların hepsi öneksiz, yani "açık" olarak okunmaya devam eder.
   */
  const kayitliKume = new Set(kayitli.split(",").filter((a) => a !== ""));
  const acikKayit = new Set(
    [...kayitliKume].filter((a) => !a.startsWith("-")),
  );
  const kapaliKayit = new Set(
    [...kayitliKume].filter((a) => a.startsWith("-")).map((a) => a.slice(1)),
  );

  const seciliMi = (oge: MenuOgesi) =>
    oge.aktif && (pathname === oge.href || pathname.startsWith(`${oge.href}/`));

  /**
   * ⚠ TERCİH HER İKİ YÖNDE DE KAYDEDİLİR. Yalnız "açık" kaydedilseydi
   * kapatma isteği hiçbir yere yazılmaz ve otomatik açılma onu ezerdi —
   * düğme çalışmıyormuş gibi görünürdü. Tam olarak yaşanan buydu.
   */
  function grubuCevir(anahtar: string, suAnAcikMi: boolean) {
    const yeni = new Set(
      [...kayitliKume].filter((a) => a !== anahtar && a !== `-${anahtar}`),
    );
    yeni.add(suAnAcikMi ? `-${anahtar}` : anahtar);
    /** ⚠ Belleğe her zaman yazılır; depolama başarısız olsa da menü çalışır. */
    menuYaz([...yeni].join(","));
    window.dispatchEvent(new Event(MENU_OLAYI));
  }

  function ogeCiz(oge: MenuOgesi) {
    if (!oge.aktif) {
      return (
        <SidebarMenuItem key={oge.anahtar}>
          <SidebarMenuButton disabled className="cursor-not-allowed opacity-50">
            <oge.icon />
            <span>{tMenu(oge.anahtar)}</span>
          </SidebarMenuButton>
          <SidebarMenuBadge className="text-muted-foreground">
            {tMenu("yakinda")}
          </SidebarMenuBadge>
        </SidebarMenuItem>
      );
    }
    return (
      <SidebarMenuItem key={oge.anahtar}>
        <SidebarMenuButton asChild isActive={seciliMi(oge)}>
          <Link href={oge.href}>
            <oge.icon />
            <span>{tMenu(oge.anahtar)}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  function duzCiz(ogeler: MenuOgesi[]) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>{ogeler.map(ogeCiz)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  function grupCiz(grup: MenuGrubu) {
    /**
     * ⚠ AÇIK SAYFANIN GRUBU KENDİLİĞİNDEN AÇILIR. `/hakedis`teyken "Para"
     * kapalıysa kullanıcı bulunduğu yeri menüde GÖREMEZ — bu, olduğundan
     * kötü hissettirir ve "kayboldum" duygusu üretir. Kayıtlı tercih
     * bunun üstüne EKLENİR, yerine geçmez.
     */
    const icindeSecili = grup.ogeler.some(seciliMi);
    /**
     * ⚠ SIRA ÖNEMLİ: AÇIK TERCİH ÖNCE SORULUR. Kullanıcı bu grubu bilerek
     * kapattıysa, içinde bulunduğu sayfa olsa bile kapalı kalır — kararı
     * o verdi ve düğme çalışıyor olmalı.
     */
    const acik = kapaliKayit.has(grup.anahtar)
      ? false
      : icindeSecili || acikKayit.has(grup.anahtar);

    return (
      <SidebarGroup key={grup.anahtar}>
        {/* ⚠ BAŞLIK TIKLANABİLİR GÖRÜNÜR (İlke #2): düğme, imleç ve ok.
            Ok yönü açık/kapalıyı söyler — gizli tıklama alanı yok. */}
        <SidebarGroupLabel asChild>
          <button
            type="button"
            onClick={() => grubuCevir(grup.anahtar, acik)}
            aria-expanded={acik}
            className="hover:bg-sidebar-accent flex w-full items-center justify-between rounded-md transition-colors"
          >
            <span>{tMenu(grup.anahtar)}</span>
            <ChevronDown
              className={`size-4 shrink-0 transition-transform ${acik ? "" : "-rotate-90"}`}
              aria-hidden="true"
            />
          </button>
        </SidebarGroupLabel>
        {acik ? (
          <SidebarGroupContent>
            <SidebarMenu>{grup.ogeler.map(ogeCiz)}</SidebarMenu>
          </SidebarGroupContent>
        ) : null}
      </SidebarGroup>
    );
  }

  return (
    <Sidebar className="print:hidden">
      <SidebarHeader className="px-4 py-3">
        {/* Logo ana sayfaya döner. */}
        <Link
          href="/"
          className="hover:bg-sidebar-accent -mx-2 flex items-center gap-2.5 rounded-md px-2 py-1 transition-colors"
        >
          {/* MARKA KARESİ — tasarım referansındaki aksan renkli kare.
              Uygulamanın adı TEK sabitten okunuyor (anayasa); kare de o adın
              baş harfini taşıyor, yani marka değiştiğinde burada elle
              güncellenecek bir şey kalmıyor. */}
          <span
            className="bg-sidebar-primary text-sidebar-primary-foreground grid size-7 shrink-0 place-items-center rounded-md text-sm font-bold"
            aria-hidden="true"
          >
            {UYGULAMA.ad.charAt(0)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-base font-semibold">{UYGULAMA.ad}</span>
            <span className="text-muted-foreground text-xs">{t("slogan")}</span>
          </span>
        </Link>
      </SidebarHeader>
      {/* ⚠ MENÜ MARKADAN AYRIŞSIN (kullanıcı 22.08.2026: "biraz daha
          aşağıdan başlayabilir"). Marka bloğu ile ilk satır bitişikti;
          göz ikisini tek küme olarak okuyor ve "Panel" başlığın parçası
          gibi görünüyordu. */}
      <SidebarContent className="pt-3">
        {duzCiz(GUNLUK)}
        {GRUPLAR.map(grupCiz)}
      </SidebarContent>

      {/* ══════════════ ALT — SABİT, KAYMAZ ══════════════
          Kullanıcı 22.08.2026: _"burası en altta mail yazan yerin üstünde
          SABİT olarak dursun."_

          ⚠ ÖNCE İÇERİĞİN İÇİNDEYDİ ve grupların ardından geliyordu: menü
          uzayınca aşağı kayıyor, kısayken ortada asılı kalıyordu. İkisi de
          yanlış — El Kitabı ve Destek talepleri "bir şey bilmediğin an"
          gidilen yerler ve o an menüyü KAYDIRMAK istemezsin (İlke #9).

          ⚠ ÇIKIŞTAN AYRI BİR BLOK: aynı `SidebarFooter` içinde ama kendi
          kenarlığıyla. Yan yana konsalardı "çıkış" ile "el kitabı" aynı
          ağırlıkta görünürdü; biri gündelik yardım, öteki oturumu bitiren
          eylem. */}
      <SidebarFooter className="gap-0 p-0">
        <div className="px-2 py-2">{duzCiz(ALT)}</div>
        {/* Kim olarak girildiği ve çıkış — her ekranda görünür (#1, #10). */}
        {eposta ? (
          <div className="border-sidebar-border border-t px-2 py-2">
            <CikisButonu eposta={eposta} />
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
