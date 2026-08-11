"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { KodCakismasi } from "./actions";

/**
 * ============================================================================
 *  KOD ÇAKIŞMASI — EYLEME DÖNÜK
 * ----------------------------------------------------------------------------
 *  Eskiden "Barkod 5702018067499 başka bir üründe kullanılıyor" diye düz
 *  metin yazıyordu. Kullanıcı o ürünü elle aramak zorundaydı ve genelde
 *  aramıyordu — ikinci bir kayıt açıyordu.
 *
 *  Artık hangi ürün olduğu yazıyor ve iki yol veriliyor:
 *   - Ürüne git: yanlışlıkla ikinci kez açıyorsa oraya gider
 *   - Bu ürüne alım ekle: zaten yapmak istediği buysa doğrudan alıma geçer
 *
 *  Bağlantılar YENİ SEKMEDE açılır: yarım doldurulmuş ürün formu kaybolmasın.
 * ============================================================================
 */
export function CakismaUyarisi({ cakismalar }: { cakismalar: KodCakismasi[] }) {
  const t = useTranslations("Urunler");
  const ortak = useTranslations("Ortak");

  if (!cakismalar.length) return null;

  const alanAdi = (alan: KodCakismasi["alan"]) =>
    alan === "sku"
      ? ortak("sku")
      : alan === "firmaSku"
        ? ortak("firmaSku")
        : ortak("barkod");

  return (
    <div className="space-y-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
      {cakismalar.map((c, i) => (
        <div key={`${c.alan}-${c.deger}-${i}`} className="space-y-2">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {t("cakismaMetni", {
              alan: alanAdi(c.alan),
              deger: c.deger,
              urun: c.urunAdi,
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/urunler/${c.urunId}`}
                target="_blank"
                rel="noopener"
              >
                <ExternalLink />
                {t("cakismaUruneGit")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/alimlar/yeni" target="_blank" rel="noopener">
                <ShoppingCart />
                {t("cakismaAlimEkle")}
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
