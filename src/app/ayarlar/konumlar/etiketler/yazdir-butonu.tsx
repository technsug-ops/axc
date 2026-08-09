"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function YazdirButonu() {
  const t = useTranslations("Raf");

  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer />
      {t("yazdir")}
    </Button>
  );
}
