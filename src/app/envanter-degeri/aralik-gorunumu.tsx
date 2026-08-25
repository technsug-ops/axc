import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { ListeKarti } from "@/components/liste-karti";
import { UzunAd } from "@/components/uzun-ad";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import type { AralikSonucu } from "@/lib/envanter-aralik";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  ARALIK GÖRÜNÜMÜ — AÇILIŞ · KAPANIŞ · FARK (K53-②, 26.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ FARK SÜTUNU AYRI SORGUDAN GELMİYOR: iki fotoğrafın ÇIKARMASI.
 *  Üçüncü bir hesap yolu açılsaydı, bir gün ayrıştığında hangisinin doğru
 *  olduğu anlaşılmazdı.
 *
 *  ⚠ SIFIR FARK GİZLENMEZ. "Değişmeyen satırı niye gösteriyorsun" makul
 *  görünür ama yanlıştır: dönem boyunca HİÇ dokunulmamış mal, envanterin
 *  en pahalı kısmı olabilir (yatan sermaye). Gizlemek onu görünmez yapardı.
 * ============================================================================
 */

export async function AralikGorunumu({
  sonuc,
  basMetin,
  bitMetin,
}: {
  sonuc: AralikSonucu;
  basMetin: string;
  bitMetin: string;
}) {
  const t = await getTranslations("Envanter");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const isaretli = (n: number) => (n > 0 ? `+${n}` : String(n));
  const farkRengi = (n: number) =>
    n > 0 ? DURUM_YAZISI.olumlu : n < 0 ? DURUM_YAZISI.olumsuz : "";

  return (
    <div className="space-y-6">
      {/*
        ═══ İÇ TUTARLILIK ÇAPRAZI ══════════════════════════════════════════
        ⚠ İKİ DEFTER AYNI ŞEYİ SÖYLEMEK ZORUNDA. FIFO'dan gelen fark ile
        ledger'ın aralıktaki neti ayrışıyorsa ekran bunu SÖYLER — ama HÜKÜM
        VERMEZ: hangi defterin doğru olduğu vakaya göre değişir ve
        körlemesine hizalamak veriyi bozar.

        ⚠ VE TUTUYORSA DA YAZAR (açık sıfır): "kontrol edildi ve temiz" ile
        "hiç kontrol edilmedi" ekranda aynı görünemez.
      */}
      {sonuc.capraz.tutuyorMu ? (
        <p className="text-muted-foreground text-sm">
          {t("caprazTemiz", { adet: isaretli(sonuc.capraz.farkAdet) })}
        </p>
      ) : (
        <div
          className={`flex gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}
          role="status"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">
              {t("caprazAyrisma", {
                fark: isaretli(sonuc.capraz.farkAdet),
                ledger: isaretli(sonuc.capraz.ledgerNet),
                sapma: isaretli(sonuc.capraz.farkAdet - sonuc.capraz.ledgerNet),
              })}
            </p>
            {/* ⚠ HÜKÜM YOK — yalnız işaret ve nereye bakılacağı. */}
            <p className="text-xs">{t("caprazNotu")}</p>
          </div>
        </div>
      )}

      {sonuc.bloklar.map((blok) => (
        <Card key={blok.paraBirimi}>
          <CardHeader>
            <CardTitle className="text-base">
              {t("aralikBaslik", {
                bas: basMetin,
                bit: bitMetin,
                para: blok.paraBirimi,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* --- DÖNEM ÖZETİ: üç kutucuk (İlke #12 — kompakt ızgara) --- */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("acilis")}
                </div>
                <div className="text-2xl font-semibold">{blok.acilisAdet}</div>
                <div className="text-muted-foreground text-sm">
                  {bicim.para(blok.acilisDeger, blok.paraBirimi)}
                </div>
              </div>
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("kapanis")}
                </div>
                <div className="text-2xl font-semibold">{blok.kapanisAdet}</div>
                <div className="text-muted-foreground text-sm">
                  {bicim.para(blok.kapanisDeger, blok.paraBirimi)}
                </div>
              </div>
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">{t("fark")}</div>
                <div
                  className={`text-2xl font-semibold ${farkRengi(blok.farkAdet)}`}
                >
                  {isaretli(blok.farkAdet)}
                </div>
                <div className={`text-sm ${farkRengi(blok.farkDeger)}`}>
                  {bicim.para(blok.farkDeger, blok.paraBirimi)}
                </div>
              </div>
            </div>

            {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ortak("urun")}</TableHead>
                    <TableHead className="text-right">{t("acilis")}</TableHead>
                    <TableHead className="text-right">{t("kapanis")}</TableHead>
                    <TableHead className="text-right">{t("fark")}</TableHead>
                    <TableHead className="text-right">
                      {t("farkDegeri")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blok.satirlar.map((s) => {
                    const k = sonuc.kimlikler.get(s.variantId);
                    return (
                      <TableRow key={`${s.variantId}-${s.paraBirimi}`}>
                        <TableCell className="max-w-72">
                          <UzunAd metin={k?.urunAdi ?? s.variantId} />
                          <span className="text-muted-foreground block text-xs">
                            {k?.sku ?? ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.acilisAdet}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.kapanisAdet}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${farkRengi(s.farkAdet)}`}
                        >
                          {isaretli(s.farkAdet)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${farkRengi(s.farkDeger ?? 0)}`}
                        >
                          {/*
                            ⚠ DEĞERİ BİLİNMEYEN SATIR "0" YAZMAZ. Sıfır
                            yazsaydı "hiç değişmedi" denmiş olurdu; oysa
                            bilinmeyen ile değişmemiş farklı şeyler.
                          */}
                          {s.farkDeger === null
                            ? t("hesaplanamadi")
                            : bicim.para(s.farkDeger, s.paraBirimi)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ------------------------ TELEFON: KART ---------------------- */}
            <div className="space-y-3 md:hidden">
              {blok.satirlar.map((s) => {
                const k = sonuc.kimlikler.get(s.variantId);
                return (
                  <ListeKarti
                    key={`${s.variantId}-${s.paraBirimi}`}
                    baslik={k?.urunAdi ?? s.variantId}
                    altBaslik={k?.sku ?? ""}
                    alanlar={[
                      { etiket: t("acilis"), deger: String(s.acilisAdet) },
                      { etiket: t("kapanis"), deger: String(s.kapanisAdet) },
                      {
                        etiket: t("fark"),
                        deger: (
                          <span className={farkRengi(s.farkAdet)}>
                            {isaretli(s.farkAdet)}
                          </span>
                        ),
                      },
                      {
                        etiket: t("farkDegeri"),
                        deger:
                          s.farkDeger === null
                            ? t("hesaplanamadi")
                            : bicim.para(s.farkDeger, s.paraBirimi),
                      },
                    ]}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
