"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DURUM_YAZISI } from "@/lib/renkler";
import { GECISLER, type TalepDurumu } from "@/lib/talep/turler";
import { talepDurumDegistir } from "./eylemler";

/**
 * DURUM İLERLETME — YALNIZ `destek.yonet` OLANDA ÇİZİLİR.
 *
 * Bileşen sayfadan koşulla çağrılıyor; yetkisiz kullanıcıya pasif düğme
 * değil HİÇBİR ŞEY gösterilmiyor. Pasif düğme "bir gün belki" der ve
 * kullanıcıyı yapamayacağı bir işe davet eder (İlke #5, K19 dersi).
 *
 * SEÇENEKLER GEÇİŞ TABLOSUNDAN: "her durumdan her duruma" listesi
 * gösterilseydi kapanmış talep bir tıkla yeniden açılabilirdi. Aynı kural
 * sunucuda da doğrulanıyor — bu liste kolaylık, güvenlik değil.
 */
export function DurumKontrolu({
  talepId,
  mevcutDurum,
}: {
  talepId: string;
  mevcutDurum: TalepDurumu;
}) {
  const t = useTranslations("Talep");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [hedef, setHedef] = useState<string>("");
  const [not, setNot] = useState("");

  const secenekler = GECISLER[mevcutDurum];
  // SON DURAK: kapanmış talepte ilerletecek bir şey yok, kutu da çizilmez.
  if (secenekler.length === 0) return null;

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="text-xs font-medium">{t("durumIlerlet")}</div>
      {/**
       * ⚠ NOT ALANI DÜĞMEDEN ÖNCE — 17.08.2026 canlı bulgusu.
       *
       * İlk hâlinde not kutusu "Güncelle" düğmesinin ALTINDAYDI. Kullanıcı
       * yukarıdan aşağı okuyup durumu seçiyor, düğmeye basıyor ve notu HİÇ
       * görmüyordu: TLP-0001 "Çözüldü"ye geçti, çözüm notu boş kaldı.
       *
       * Kayıp sessizdi — hata yok, uyarı yok, sadece boş bir alan. Bir
       * formda EYLEM DÜĞMESİ EN SONDA durur; ondan sonra gelen alan
       * doldurulmaz.
       */}
      <Textarea
        rows={2}
        value={not}
        onChange={(e) => setNot(e.target.value)}
        placeholder={t("cozumNotuIpucu")}
      />

      <div className="flex flex-wrap items-start gap-2">
        <Select value={hedef} onValueChange={setHedef}>
          <SelectTrigger className="h-11 w-full sm:w-56 md:h-9">
            <SelectValue placeholder={t("durumSecinIstege")} />
          </SelectTrigger>
          <SelectContent>
            {secenekler.map((d) => (
              <SelectItem key={d} value={d}>
                {t(`durum${d}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="h-11 md:h-9"
          /**
           * NOT TEK BAŞINA DA KAYDEDİLİR. Düğme önce yalnız hedef durum
           * seçiliyken açılıyordu; "çözdüm, açıklamasını yazayım" demek
           * imkânsızdı çünkü COZULDU'dan çıkış talebin anlamını değiştirir.
           */
          disabled={bekliyor || (hedef === "" && not.trim() === "")}
          onClick={() =>
            basla(async () => {
              setHata(null);
              const sonuc = await talepDurumDegistir(
                talepId,
                // Boş seçim = durum DEĞİŞMESİN, yalnız not yazılsın.
                hedef === "" ? null : (hedef as TalepDurumu),
                not,
              );
              if (sonuc.tamam) {
                setHedef("");
                setNot("");
                router.refresh();
              } else setHata(sonuc.hata ?? null);
            })
          }
        >
          {bekliyor
            ? ortak("kaydediliyor")
            : hedef === ""
              ? t("notuKaydet")
              : t("durumGuncelle")}
        </Button>
      </div>
      {hata ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{hata}</p> : null}
    </div>
  );
}
