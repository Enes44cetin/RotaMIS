"use client";

import { motion, useReducedMotion } from "motion/react";
import { Award, Sparkles } from "lucide-react";

interface XpBurstProps {
  xp: number;
}

export function XpBurst({ xp }: XpBurstProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-400 text-amber-950 font-black text-sm shadow-lg">
        <Award className="w-4 h-4" />
        <span>+{xp} XP Kazanıldı!</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 16 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.12, 1, 0.95], y: [16, -12, -26, -42] }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="pointer-events-none inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-sm shadow-xl shadow-amber-500/35"
    >
      <Sparkles className="w-4 h-4" />
      <span>+{xp} XP!</span>
    </motion.div>
  );
}

