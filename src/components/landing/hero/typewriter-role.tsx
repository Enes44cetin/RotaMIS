"use client";

import { useEffect, useState } from "react";
import { LANDING_ROLES } from "@/lib/landing/content";

interface TypewriterRoleProps {
  currentRoleIndex: number;
  onRoleChange: (nextIndex: number) => void;
  isPaused?: boolean;
}

export function TypewriterRole({
  currentRoleIndex,
  onRoleChange,
  isPaused = false,
}: TypewriterRoleProps) {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fullText = LANDING_ROLES[currentRoleIndex]?.name || "";

  useEffect(() => {
    if (isPaused) {
      setDisplayText(fullText);
      setIsDeleting(false);
      return;
    }

    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayText === fullText) {
      // Pause at full text before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 2200);
    } else if (isDeleting && displayText === "") {
      // Finished deleting, switch to next role
      setIsDeleting(false);
      const nextIdx = (currentRoleIndex + 1) % LANDING_ROLES.length;
      onRoleChange(nextIdx);
    } else if (isDeleting) {
      // Deleting letters
      timeout = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
      }, 45);
    } else {
      // Typing letters
      timeout = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
      }, 85);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, fullText, currentRoleIndex, onRoleChange, isPaused]);

  return (
    <span className="inline-flex items-center text-[#2F5BFF]">
      <span className="font-extrabold underline decoration-[#2F5BFF]/30 underline-offset-4">
        {displayText || "\u00A0"}
      </span>
      <span className="inline-block w-[3px] h-6 sm:h-8 bg-[#2F5BFF] ml-1 animate-cursor-blink" />
    </span>
  );
}
