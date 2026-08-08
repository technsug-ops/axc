import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Geist } from "next/font/google";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Axcali ERP",
  description: "Çok kanallı e-ticaret operasyon yönetimi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={cn("font-sans", geist.variable)}>
      <body>
        <TooltipProvider delayDuration={0}>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-4 print:hidden">
                {/*
                  Menü tetikleyicisi.
                  shadcn varsayılanı size="icon-sm" (28px) ve variant="ghost"
                  (durağan halde görünmez). Telefonda bu hem çok küçük bir
                  dokunma hedefi (Android asgarisi 48dp) hem de görünmez bir
                  düğme; yanındaki marka linkiyle dokunuş yarışına giriyordu.
                  Mobilde 44px + çerçeveli, masaüstünde eski boyutunda.
                */}
                <SidebarTrigger
                  variant="outline"
                  aria-label="Menüyü aç"
                  className="size-11 shrink-0 md:size-8"
                />
                <Link
                  href="/"
                  className="hover:bg-accent inline-flex items-center gap-2 rounded-md px-2 py-2 font-semibold transition-colors"
                >
                  <Home className="size-4" />
                  Axcali ERP
                </Link>
              </header>
              {/*
                Burada <main> KULLANILMAZ: SidebarInset zaten <main> üretiyor,
                iç içe main geçersiz HTML olur.
              */}
              <div className="flex-1 p-4 md:p-6 print:p-0">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
