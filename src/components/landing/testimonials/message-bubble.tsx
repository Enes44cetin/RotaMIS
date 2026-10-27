import { MessageSquare, Sparkles } from "lucide-react";

interface MessageBubbleProps {
  tag: string;
  quote: string;
  topic: string;
  color: string;
}

export function MessageBubble({ tag, quote, topic, color }: MessageBubbleProps) {
  return (
    <div className="w-[320px] sm:w-[380px] p-5 rounded-2xl bg-white border border-slate-200/90 shadow-md shadow-slate-200/40 hover:border-blue-400 hover:shadow-lg transition-all shrink-0 select-none">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${color} text-white flex items-center justify-center font-bold text-xs shadow-xs`}
          >
            YBS
          </div>
          <div>
            <div className="font-extrabold text-xs text-[#0B1F4D] flex items-center gap-1">
              <span>{tag}</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Öğrenci Deneyimi</div>
          </div>
        </div>

        <MessageSquare className="w-4 h-4 text-slate-300" />
      </div>

      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal mb-3">
        "{quote}"
      </p>

      <div className="text-[11px] font-bold text-[#2F5BFF]">
        {topic}
      </div>
    </div>
  );
}
