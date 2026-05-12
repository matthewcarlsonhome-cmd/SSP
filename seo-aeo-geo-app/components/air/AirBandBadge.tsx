import { AIR_BANDS } from "@/lib/air/config";
import type { AirBand } from "@/lib/air/types";
import { cn } from "@/lib/utils";

const classes: Record<AirBand, string> = {
  ai_native_ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  foundation_strong: "border-emerald-200 bg-emerald-50 text-emerald-800",
  catch_up: "border-amber-200 bg-amber-50 text-amber-800",
  stabilization_first: "border-amber-200 bg-amber-50 text-amber-800",
  pre_ai: "border-red-200 bg-red-50 text-red-800",
};

export function AirBandBadge({ band, className }: { band: AirBand; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", classes[band], className)}>
      {AIR_BANDS[band].label}
    </span>
  );
}
