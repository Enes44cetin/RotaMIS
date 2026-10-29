import { Award, Lock } from "lucide-react";
import { resolveBadgeIcon, formatBadgeCriteria } from "@/lib/path/task-meta";
import type { BadgeCatalogItem, UserBadgeWithDetails } from "@/types/database";

interface BadgeShelfProps {
  allBadges: BadgeCatalogItem[];
  userBadges: UserBadgeWithDetails[];
}

export function BadgeShelf({ allBadges, userBadges }: BadgeShelfProps) {
  const earnedMap = new Map<string, string>();
  userBadges.forEach((ub) => {
    if (ub.badge?.id) {
      earnedMap.set(ub.badge.id, ub.earned_at);
    }
  });

  // Sort earned badges first, then locked badges by sort_order
  const orderedCatalog = [...allBadges].sort((a, b) => {
    const aEarned = earnedMap.has(a.id) ? 0 : 1;
    const bEarned = earnedMap.has(b.id) ? 0 : 1;
    if (aEarned !== bEarned) return aEarned - bEarned;
    return a.sort_order - b.sort_order;
  });

  // Fallback if catalog table was empty but userBadges has items
  const displayList: Array<{
    id: string;
    name_tr: string;
    description_tr: string | null;
    icon: string | null;
    earned: boolean;
    hint: string;
    xpBonus: number;
  }> =
    orderedCatalog.length > 0
      ? orderedCatalog.map((b) => ({
          id: b.id,
          name_tr: b.name_tr,
          description_tr: b.description_tr,
          icon: b.icon,
          earned: earnedMap.has(b.id),
          hint: formatBadgeCriteria(b.criteria_type, b.criteria_value),
          xpBonus: b.xp_bonus,
        }))
      : userBadges
          .filter((ub) => ub.badge !== null)
          .map((ub) => ({
            id: ub.badge!.id,
            name_tr: ub.badge!.name_tr,
            description_tr: ub.badge!.description_tr,
            icon: ub.badge!.icon,
            earned: true,
            hint: "Kazanıldı",
            xpBonus: 0,
          }));

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/80">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-extrabold text-[#0B1F4D] uppercase tracking-wider">
            Rozet Koleksiyonu
          </h2>
        </div>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full tabular-nums">
          {earnedMap.size} / {Math.max(displayList.length, earnedMap.size)}
        </span>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400">
          Görevleri tamamladıkça rozetlerin burada listelenecek.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {displayList.map((item) => {
            const IconComponent = resolveBadgeIcon(item.icon);
            return (
              <div
                key={item.id}
                title={
                  item.earned
                    ? `${item.name_tr}: ${item.description_tr || "Kazanıldı"}`
                    : `Nasıl kazanılır: ${item.hint}`
                }
                className={`relative p-3 rounded-xl border transition-all flex flex-col items-center text-center ${
                  item.earned
                    ? "bg-gradient-to-b from-amber-50/90 to-white border-amber-200/90 shadow-2xs"
                    : "bg-slate-50/70 border-slate-200/60 opacity-75"
                }`}
              >
                {!item.earned && (
                  <span
                    aria-label="Kilitli rozet"
                    className="absolute top-2 right-2 w-4 h-4 rounded-full bg-slate-200/90 text-slate-500 flex items-center justify-center"
                  >
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}

                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
                    item.earned
                      ? "bg-amber-100 text-amber-600 shadow-2xs"
                      : "bg-slate-200/70 text-slate-400"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                <div
                  className={`font-bold text-[11px] line-clamp-1 ${
                    item.earned ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {item.name_tr}
                </div>

                <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {item.earned ? item.description_tr || "Kazanıldı!" : item.hint}
                </div>

                {!item.earned && item.xpBonus > 0 && (
                  <span className="mt-1.5 text-[9px] font-bold text-slate-500 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-md">
                    +{item.xpBonus} XP Bonus
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

