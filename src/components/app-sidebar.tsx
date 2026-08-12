"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Banknote,
  BookOpen,
  Boxes,
  Coins,
  CreditCard,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  MapPin,
  Package,
  PackageX,
  Percent,
  Receipt,
  ShoppingCart,
  Store,
  Truck,
  Tags,
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

const OPERASYON: MenuOgesi[] = [
  { anahtar: "panel", href: "/", icon: LayoutDashboard, aktif: true },
  { anahtar: "urunler", href: "/urunler", icon: Package, aktif: true },
  { anahtar: "alimlar", href: "/alimlar", icon: ShoppingCart, aktif: true },
  { anahtar: "satislar", href: "/satislar", icon: Receipt, aktif: true },
  { anahtar: "stok", href: "/stok", icon: Boxes, aktif: true },
  {
    anahtar: "envanterDegeri",
    href: "/envanter-degeri",
    icon: Coins,
    aktif: true,
  },
  { anahtar: "kanalSkulari", href: "/kanal-sku", icon: Tags, aktif: true },
  { anahtar: "giderler", href: "/giderler", icon: Wallet, aktif: true },
  { anahtar: "rapor", href: "/rapor", icon: BarChart3, aktif: true },
  { anahtar: "kartlar", href: "/kartlar", icon: CreditCard, aktif: true },
  { anahtar: "kartBorcu", href: "/kart-borcu", icon: Landmark, aktif: true },
  { anahtar: "tazminat", href: "/tazminat", icon: PackageX, aktif: true },
  { anahtar: "hakedis", href: "/hakedis", icon: Banknote, aktif: true },
];

const AYARLAR: MenuOgesi[] = [
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
    anahtar: "kanalHesaplari",
    href: "/ayarlar/kanallar",
    icon: Store,
    aktif: true,
  },
  {
    anahtar: "tedarikciler",
    href: "/ayarlar/tedarikciler",
    icon: Truck,
    aktif: true,
  },
  {
    anahtar: "veriAktarimi",
    href: "/ayarlar/ice-aktarma",
    icon: FileSpreadsheet,
    aktif: true,
  },
  {
    anahtar: "geriYukleme",
    href: "/ayarlar/geri-yukleme",
    icon: DatabaseBackup,
    aktif: true,
  },
  { anahtar: "elKitabi", href: "/el-kitabi", icon: BookOpen, aktif: true },
  {
    anahtar: "veriDisari",
    href: "/ayarlar/disa-aktarma",
    icon: Download,
    aktif: true,
  },
];

export function AppSidebar({ eposta }: { eposta?: string }) {
  const pathname = usePathname();
  const t = useTranslations("Uygulama");
  const tMenu = useTranslations("Menu");

  function grupCiz(baslik: string, ogeler: MenuOgesi[]) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{baslik}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {ogeler.map((oge) => {
              const seciliMi =
                oge.aktif &&
                (pathname === oge.href || pathname.startsWith(`${oge.href}/`));

              if (!oge.aktif) {
                return (
                  <SidebarMenuItem key={oge.anahtar}>
                    <SidebarMenuButton
                      disabled
                      className="cursor-not-allowed opacity-50"
                    >
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
                  <SidebarMenuButton asChild isActive={seciliMi}>
                    <Link href={oge.href}>
                      <oge.icon />
                      <span>{tMenu(oge.anahtar)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Sidebar className="print:hidden">
      <SidebarHeader className="px-4 py-3">
        {/* Logo ana sayfaya döner. */}
        <Link
          href="/"
          className="hover:bg-sidebar-accent -mx-2 flex flex-col rounded-md px-2 py-1 transition-colors"
        >
          <span className="text-base font-semibold">{UYGULAMA.ad}</span>
          <span className="text-muted-foreground text-xs">{t("slogan")}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {grupCiz(tMenu("operasyon"), OPERASYON)}
        {grupCiz(tMenu("ayarlar"), AYARLAR)}
      </SidebarContent>

      {/* Kim olarak girildiği ve çıkış — her ekranda görünür (#1, #10). */}
      {eposta ? (
        <SidebarFooter className="px-2 py-2">
          <CikisButonu eposta={eposta} />
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
