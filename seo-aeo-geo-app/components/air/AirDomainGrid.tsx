import { AIR_DOMAINS } from "@/lib/air/config";
import { AIR_SUB_DIMENSIONS } from "@/lib/air/scoring/domains";
import type { AirDomain, AirDomainScore } from "@/lib/air/types";

export function AirDomainGrid({
  domains,
  showSubDimensions = false,
  onDomainClick,
}: {
  domains: AirDomainScore[];
  showSubDimensions?: boolean;
  onDomainClick?: (domain: AirDomain) => void;
}) {
  const ordered = [...domains].sort((a, b) => AIR_DOMAINS[a.domain].order - AIR_DOMAINS[b.domain].order);

  return (
    <div className="space-y-3">
      {ordered.map((domain) => {
        const pct = Math.max(0, Math.min(100, (domain.totalScore / 20) * 100));
        const color = domain.totalScore >= 14 ? "bg-emerald-600" : domain.totalScore >= 7 ? "bg-amber-500" : "bg-red-600";
        const content = (
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{AIR_DOMAINS[domain.domain].label}</p>
                <p className="text-xs text-muted-foreground">
                  {AIR_SUB_DIMENSIONS[domain.domain].map((item) => item.label).join(" / ")}
                </p>
              </div>
              <span className="text-sm font-semibold">{domain.totalScore.toFixed(1)}/20</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            {showSubDimensions ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {domain.subDimensions.map((sub) => (
                  <div key={sub.subDimension} className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span>{sub.subDimension.replaceAll("_", " ")}</span>
                      <span className="font-semibold">{sub.finalScore}/5</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{sub.confidence} confidence</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );

        return onDomainClick ? (
          <button key={domain.domain} type="button" onClick={() => onDomainClick(domain.domain)} className="block w-full text-left">
            {content}
          </button>
        ) : (
          <div key={domain.domain}>{content}</div>
        );
      })}
    </div>
  );
}
