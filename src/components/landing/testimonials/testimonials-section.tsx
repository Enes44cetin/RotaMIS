import { STUDENT_VOICES } from "@/lib/landing/content";
import { MessageBubble } from "./message-bubble";
import { Reveal } from "@/components/motion/reveal";

export function TestimonialsSection() {
  // Duplicate arrays to make seamless infinite loop
  const row1 = [...STUDENT_VOICES, ...STUDENT_VOICES];
  const row2 = [...STUDENT_VOICES.slice(3), ...STUDENT_VOICES.slice(0, 3), ...STUDENT_VOICES];

  return (
    <section id="deneyimler" className="py-20 bg-[#F7F9FC] overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <Reveal direction="down">
          <span className="text-xs font-extrabold text-[#2F5BFF] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 inline-block mb-3">
            Öğrenci İç Sesi
          </span>
        </Reveal>
        <Reveal direction="up" delay={0.1}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F4D] tracking-tight">
            Tanıdık geldi mi?
          </h2>
        </Reveal>
        <Reveal direction="up" delay={0.2}>
          <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            YBS amfilerinde, staj mülakatlarında ve mezuniyet öncesinde en sık karşılaştığımız gerçek düşünceler.
          </p>
        </Reveal>
      </div>

      {/* Infinite scrolling rows with left & right gradient masks */}
      <div className="relative w-full overflow-hidden space-y-4">
        {/* Left & Right gradient edge fades */}
        <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#F7F9FC] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#F7F9FC] to-transparent z-10 pointer-events-none" />

        {/* Row 1: Scrolling left */}
        <div className="flex gap-4 animate-marquee-left">
          {row1.map((item, idx) => (
            <MessageBubble
              key={`row1-${idx}`}
              tag={item.tag}
              quote={item.quote}
              topic={item.topic}
              color={item.color}
            />
          ))}
        </div>

        {/* Row 2: Scrolling right */}
        <div className="flex gap-4 animate-marquee-right">
          {row2.map((item, idx) => (
            <MessageBubble
              key={`row2-${idx}`}
              tag={item.tag}
              quote={item.quote}
              topic={item.topic}
              color={item.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
