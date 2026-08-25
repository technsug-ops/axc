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
  ListOrdered,
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
import { MENU_ADRESLERI } from "@/lib/menu/katalog";
import type { CozulmusDuzen } from "@/lib/menu/duzen";
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
 * ── MENÜ ARTIK VERİ (K51, 25.08.2026) ───────────────────────────────────
 *
 * Sıra ve gruplama `/ayarlar/menu`den düzenleniyor ve `Company.menuDuzeni`
 * içinde yaşıyor. Bu dosyada kalan tek şey İKON EŞLEMESİ.
 *
 * ⚠ NİYE TAŞINDI: menü sırası ÜÇ KEZ koddan değişti (22.08 yedi kalem ·
 * 25.08 `Paketle` · 25.08 kullanıcı sırayı birebir verdi). Her seferinde
 * iki dosya elden geçti, bir bekçi sınırı ELLE artırıldı, bir deploy
 * beklendi. Sıralamak bir kod işi değildir.
 *
 * ⚠ AMA KATALOG KODDA KALDI (`lib/menu/katalog.ts`): kullanıcı SIRAYI
 * değiştirir, hangi ekranların VAR OLDUĞUNU değiştirmez. Tersi yapılsaydı
 * koda eklenen yeni bir ekran menüde HİÇ görünmezdi.
 *
 * ⚠ İKON BURADA ÇÜNKÜ SAF DEĞİL. Katalog modülü bekçinin içeri alabilmesi
 * için saf kalmalı; ikon bir React bileşenidir. Bekçi bu eşlemenin TAM
 * olduğunu ayrıca ölçüyor — ikonsuz bir katalog kalemi çizilemezdi.
 */
const MENU_IKONLARI: Record<string, typeof Package> = {
  panel: LayoutDashboard,
  satislar: Receipt,
  alimlar: ShoppingCart,
  urunler: Package,
  stok: Boxes,
  iadeler: Undo2,
  paketle: PackageCheck,
  okut: ScanSearch,
  simulasyon: Calculator,

  giderler: Wallet,
  kartlar: CreditCard,
  kartBorcu: Landmark,
  hakedis: Banknote,
  tazminat: PackageX,
  nakitTakvimi: CalendarClock,
  rapor: BarChart3,

  urunKarti: ScanBarcode,
  kanalSkulari: Tags,
  kanalHesaplari: Store,
  envanterDegeri: Coins,

  depoKurulumu: Warehouse,
  rafKonumlari: MapPin,
  kategoriler: Percent,
  duzeltmeNedenleri: ClipboardList,
  tedarikciler: Truck,
  kullanicilar: Users,
  roller: ShieldCheck,
  menuDuzeni: ListOrdered,

  veriAktarimi: FileSpreadsheet,
  veriDisari: Download,
  geriYukleme: DatabaseBackup,
  gecmisEkstre: FileSpreadsheet,
  tarife: Percent,
};

/** Anahtardan çizilebilir öğe kurar. Adres ve ikon TEK kaynaktan. */
function ogeKur(anahtar: string): MenuOgesi | null {
  const href = MENU_ADRESLERI[anahtar];
  const icon = MENU_IKONLARI[anahtar];
  /**
   * ⚠ EKSİK EŞLEME SESSİZCE ÇİZİLMEZ — ve bu bir kayıp DEĞİL: katalogda
   * olup ikonu/adresi olmayan bir anahtar zaten bekçiyi kırmızı yakar.
   * Burada `null` dönmek, canlıda çökmek yerine o satırı atlamaktır.
   */
  if (!href || !icon) return null;
  return { anahtar, href, icon, aktif: true };
}

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

export function AppSidebar({
  eposta,
  duzen,
}: {
  eposta?: string;
  /**
   * SUNUCUDA ÇÖZÜLMÜŞ DÜZEN — katalog (kod) + kayıt (veri).
   *
   * ⚠ ÇÖZÜM SUNUCUDA YAPILIR, BURADA DEĞİL. İstemcide çözülseydi menü ilk
   * boyamada varsayılan sırayla çizilir, sonra kullanıcının sırasına
   * ATLARDI — her sayfa açılışında gözle görülür bir zıplama.
   */
  duzen: CozulmusDuzen;
}) {
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

  function anahtarCiz(anahtar: string) {
    const oge = ogeKur(anahtar);
    if (!oge) return null;
    return ogeCiz(oge);
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

  /** Anahtar listesinden düz blok — günlük (hep açık) liste. */
  function anahtarlariCiz(anahtarlar: string[]) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>{anahtarlar.map(anahtarCiz)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  function grupCiz(grup: { anahtar: string; ogeler: string[] }) {
    /**
     * ⚠ AÇIK SAYFANIN GRUBU KENDİLİĞİNDEN AÇILIR. `/hakedis`teyken "Para"
     * kapalıysa kullanıcı bulunduğu yeri menüde GÖREMEZ — bu, olduğundan
     * kötü hissettirir ve "kayboldum" duygusu üretir. Kayıtlı tercih
     * bunun üstüne EKLENİR, yerine geçmez.
     */
    const icindeSecili = grup.ogeler.some((a) => {
      const o = ogeKur(a);
      return o !== null && seciliMi(o);
    });
    /**
     * ⚠ SIRA ÖNEMLİ: AÇIK TERCİH ÖNCE SORULUR. Kullanıcı bu grubu bilerek
     * kapattıysa, içinde bulunduğu sayfa olsa bile kapalı kalır — kararı
     * o verdi ve düğme çalışıyor olmalı.
     */
    const acik = kapaliKayit.has(grup.anahtar)
      ? false
      : icindeSecili || acikKayit.has(grup.anahtar);

    /**
     * ⚠ BOŞ GRUP ÇİZİLMEZ. Kullanıcı bir grubun bütün öğelerini başka yere
     * taşıyabilir; geriye kalan başlık tıklanınca HİÇBİR ŞEY açmayan bir
     * düğme olurdu — sessiz başarısızlık (İlke #5). Grup kaybolmaz, yalnız
     * boşken görünmez; içine bir öğe taşındığı an geri gelir.
     */
    if (grup.ogeler.length === 0) return null;

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
            <SidebarMenu>{grup.ogeler.map(anahtarCiz)}</SidebarMenu>
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
        {anahtarlariCiz(duzen.gunluk)}
        {duzen.gruplar.map(grupCiz)}
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
