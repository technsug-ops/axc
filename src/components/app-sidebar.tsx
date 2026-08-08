"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CreditCard,
  MapPin,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Sol menü.
 *
 * Faz 1'de sadece "Ürünler" ve "Raf Konumları" aktif. Diğer başlıklar
 * bilerek pasif duruyor — nereye gittiğimizi göstermek için görünürler
 * ama tıklanamazlar. Faz sırası CLAUDE.md'de tanımlı.
 */

type MenuOgesi = {
  baslik: string;
  href: string;
  icon: typeof Package;
  aktif: boolean;
};

const OPERASYON: MenuOgesi[] = [
  { baslik: "Ürünler", href: "/urunler", icon: Package, aktif: true },
  { baslik: "Alımlar", href: "/alimlar", icon: ShoppingCart, aktif: true },
  { baslik: "Stok", href: "/stok", icon: Boxes, aktif: true },
  { baslik: "Kartlar", href: "/kartlar", icon: CreditCard, aktif: true },
];

const AYARLAR: MenuOgesi[] = [
  {
    baslik: "Raf Konumları",
    href: "/ayarlar/konumlar",
    icon: MapPin,
    aktif: true,
  },
  {
    baslik: "Kanal Hesapları",
    href: "/ayarlar/kanallar",
    icon: Store,
    aktif: true,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

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
                  <SidebarMenuItem key={oge.baslik}>
                    <SidebarMenuButton
                      disabled
                      className="cursor-not-allowed opacity-50"
                    >
                      <oge.icon />
                      <span>{oge.baslik}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="text-muted-foreground">
                      yakında
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              }

              return (
                <SidebarMenuItem key={oge.baslik}>
                  <SidebarMenuButton asChild isActive={seciliMi}>
                    <Link href={oge.href}>
                      <oge.icon />
                      <span>{oge.baslik}</span>
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
          <span className="text-base font-semibold">Axcali ERP</span>
          <span className="text-muted-foreground text-xs">
            Çok kanallı operasyon
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {grupCiz("Operasyon", OPERASYON)}
        {grupCiz("Ayarlar", AYARLAR)}
      </SidebarContent>
    </Sidebar>
  );
}
