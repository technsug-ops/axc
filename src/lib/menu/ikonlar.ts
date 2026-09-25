import {
  BadgePercent,
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Calculator,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Coins,
  CreditCard,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  Inbox,
  Landmark,
  LayoutDashboard,
  ListFilter,
  ListOrdered,
  MapPin,
  MessageSquarePlus,
  Package,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  PackageX,
  Percent,
  Receipt,
  Route,
  ScanBarcode,
  ScanSearch,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  Truck,
  Undo2,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/**
 * ============================================================================
 *  MENÜ İKON KATALOĞU — TEK GÖVDE (K270, 25.09.2026)
 * ----------------------------------------------------------------------------
 *  Sol menü (`app-sidebar.tsx`), telefon alt barı (`alt-cubuk.tsx`), telefon
 *  menü sayfası (`/menu`) ve panelin hızlı işlemleri AYNI ikonu AYNI anahtardan
 *  okur (İlke #10: aynı işlem her ekranda aynı görünür). Harita sol menünün
 *  içinde yaşıyordu; ikinci tüketici doğunca buraya çıktı — kopyası olan
 *  seçici ölçüt iki kat tehlikelidir.
 *  Adresler `katalog.ts`te (`MENU_ADRESLERI`), sıra/gruplama `duzen.ts`te;
 *  burada yalnız GÖRÜNÜM. Anahtar üçünde de aynı sözlük anahtarıdır (`Menu.*`).
 * ============================================================================
 */
export const MENU_IKONLARI: Record<string, LucideIcon> = {
  panel: LayoutDashboard,
  satislar: Receipt,
  alimlar: ShoppingCart,
  urunler: Package,
  stok: Boxes,
  iadeler: Undo2,
  paketle: PackageCheck,
  okut: ScanSearch,
  yerlestir: PackagePlus,
  simulasyon: Calculator,

  giderler: Wallet,
  kartlar: CreditCard,
  kartBorcu: Landmark,
  hakedis: Banknote,
  tazminat: PackageX,
  nakitTakvimi: CalendarClock,
  gunlukOzet: Sparkles,
  rapor: BarChart3,
  urunAnalizi: ListFilter,

  urunKarti: ScanBarcode,
  kanalSkulari: Tags,
  kanalListeleme: PackageSearch,
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
  donemler: CalendarCheck,
  maliyetYontemi: Calculator,
  malKabul: Inbox,

  veriAktarimi: FileSpreadsheet,
  veriDisari: Download,
  geriYukleme: DatabaseBackup,
  gecmisEkstre: FileSpreadsheet,
  komisyonKapisi: Percent,
  tarife: Percent,
  tarifeHesaplama: BadgePercent,
  kargoTarifesi: Route,
  hbKargoTarife: Route,
};

/** Sol menünün ve telefon menüsünün EN ALTINDAKİ iki sabit öğe. */
export const ALT_OGELER: readonly { anahtar: string; href: string; icon: LucideIcon }[] = [
  { anahtar: "elKitabi", href: "/el-kitabi", icon: BookOpen },
  { anahtar: "talepler", href: "/talepler", icon: MessageSquarePlus },
];

/**
 * TELEFON ALT BARI — beş sekme, sıra sabit. Depoda birincil cihaz telefon
 * (anayasa: mobil eşit vatandaş) ve barkod her yerde (İlke #7); «Okut» bu
 * yüzden ortada. Anahtarlar `MENU_ADRESLERI` ve `MENU_IKONLARI` ile aynı;
 * «menu» tek istisna — kendi sayfası (`/menu`), katalogda değil.
 */
export const ALT_CUBUK_SEKMELERI = ["panel", "satislar", "okut", "alimlar", "menu"] as const;
export type AltCubukSekmesi = (typeof ALT_CUBUK_SEKMELERI)[number];

/** Panelin «Hızlı işlemler» satırı — en sık yapılan dört iş (İlke #9). */
export const HIZLI_ISLEMLER = ["okut", "paketle", "malKabul", "yerlestir"] as const;

/** Öne çıkan (koyu zemin) işlem — barkod okutma, depodaki ilk hareket. */
export const ONE_CIKAN_ISLEM = "okut";
