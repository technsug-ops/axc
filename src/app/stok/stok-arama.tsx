"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";

/**
 * Stok araması. Barkod okutulduğunda (USB Enter veya kamera) doğrudan
 * o koda göre filtreler — ayrıca elle de yazılabilir.
 */
export function StokArama({ baslangic }: { baslangic: string }) {
  const router = useRouter();
  const [sorgu, setSorgu] = useState(baslangic);

  function ara(deger: string) {
    const temiz = deger.trim();
    router.push(temiz ? `/stok?q=${encodeURIComponent(temiz)}` : "/stok");
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <BarkodGirisi
        className="max-w-sm min-w-48 flex-1"
        value={sorgu}
        onChange={setSorgu}
        onOkundu={ara}
        placeholder="Ürün adı, SKU veya barkod — okutabilirsiniz"
        kameraBasligi="Stok sorgula"
      />
      <Button type="button" variant="secondary" onClick={() => ara(sorgu)}>
        Ara
      </Button>
      {baslangic ? (
        <Button type="button" variant="ghost" asChild>
          <Link href="/stok">Temizle</Link>
        </Button>
      ) : null}
    </div>
  );
}
