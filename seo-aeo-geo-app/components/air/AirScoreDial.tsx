import type { AirBand } from "@/lib/air/types";
import { AirBandBadge } from "./AirBandBadge";

export function AirScoreDial({
  score,
  band,
  size = "md",
  showLabel = true,
}: {
  score: number;
  band: AirBand;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const dimensions = size === "lg" ? 220 : size === "sm" ? 120 : 160;
  const radius = dimensions / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg width={dimensions} height={dimensions} viewBox={`0 0 ${dimensions} ${dimensions}`} className="-rotate-90">
          <circle cx={dimensions / 2} cy={dimensions / 2} r={radius} fill="none" stroke="#E8E4DA" strokeWidth="12" />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke="#C5BE9F"
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-[#1C1C1A] text-[#FAF7F0]">
          <span className={size === "lg" ? "text-5xl font-bold" : "text-4xl font-bold"}>{Math.round(score)}</span>
          <span className="text-[10px] uppercase tracking-widest text-[#D9D5C8]">out of 100</span>
        </div>
      </div>
      {showLabel ? <AirBandBadge band={band} /> : null}
    </div>
  );
}
