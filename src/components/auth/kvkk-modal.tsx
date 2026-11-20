"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, ShieldCheck } from "lucide-react";

interface KvkkModalProps {
  open: boolean;
  onClose: () => void;
}

export function KvkkModal({ open, onClose }: KvkkModalProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kvkk-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
          />

          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 32, scale: 0.97 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.97 }
            }
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col"
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-[#2F5BFF] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#2F5BFF]">
                    6698 Sayılı Kanun Kapsamında
                  </div>
                  <h2
                    id="kvkk-modal-title"
                    className="text-base sm:text-lg font-extrabold text-[#0B1F4D]"
                  >
                    KVKK Aydınlatma Metni
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Aydınlatma metnini kapat"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs sm:text-sm text-slate-600 leading-relaxed">
              <section className="space-y-1">
                <h3 className="font-extrabold text-[#0B1F4D]">
                  1. Veri Sorumlusu ve Kapsam
                </h3>
                <p>
                  RotaMIS platformu, Yönetim Bilişim Sistemleri (YBS) öğrencilerinin
                  kariyer hedeflerine uygun beceri analizi ve öğrenme yol haritası
                  oluşturabilmesi amacıyla kişisel verilerinizi 6698 sayılı Kişisel
                  Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca işler.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-extrabold text-[#0B1F4D]">
                  2. İşlenen Kişisel Veriler
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Kimlik ve İletişim:</strong> Ad soyad ve e-posta adresi.
                  </li>
                  <li>
                    <strong>Eğitim ve Kariyer Profili:</strong> Üniversite, sınıf
                    düzeyi, staj durumu, hedef kariyer alanı, çalışma temposu ve
                    öğrenme stili tercihleri.
                  </li>
                  <li>
                    <strong>Platform İlerlemesi:</strong> Check-up beceri puanları,
                    sprint görev durumları, deneyim puanı (XP), seri ve rozetler.
                  </li>
                </ul>
              </section>

              <section className="space-y-1">
                <h3 className="font-extrabold text-[#0B1F4D]">
                  3. İşleme Amacı ve Hukuki Sebep
                </h3>
                <p>
                  Verileriniz; hesabınızın oluşturulması, sektör beklenti matrisine
                  göre beceri açığınızın hesaplanması, kişiselleştirilmiş sprint
                  görevlerinin önerilmesi ve platform güvenliğinin sağlanması
                  amaçlarıyla açık rızanız ve sözleşmenin ifası hukuki sebeplerine
                  dayanarak işlenir.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-extrabold text-[#0B1F4D]">
                  4. Aktarım ve Saklama Güvenliği
                </h3>
                <p>
                  Kişisel verileriniz üçüncü taraf reklam veya pazarlama ağlarıyla
                  paylaşılmaz. Veriler, satır düzeyinde erişim güvenliği (RLS) ile
                  korunan veritabanında yalnızca sizin erişiminize açık biçimde
                  saklanır.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-extrabold text-[#0B1F4D]">
                  5. KVKK Madde 11 Kapsamındaki Haklarınız
                </h3>
                <p>
                  Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep
                  etme, eksik/yanlış işlenmişse düzeltilmesini veya hesabınızla
                  birlikte silinmesini isteme haklarına sahipsiniz.
                </p>
              </section>
            </div>

            <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#2F5BFF] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Okudum, Anladım
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
