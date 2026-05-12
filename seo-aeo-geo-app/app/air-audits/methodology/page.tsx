import { AIR_BANDS, AIR_DOMAINS, AIR_TIER_CONFIGS } from "@/lib/air/config";
import { DOMAIN_DESCRIPTIONS } from "@/lib/air/copy/domain-descriptions";
import { BAND_DESCRIPTIONS } from "@/lib/air/copy/band-descriptions";
import { FAQ_ITEMS } from "@/lib/air/copy/faq";
import { AIR_SCORE_HEADLINE, AIR_SCORE_INTRO, METHODOLOGY_HEADLINE, METHODOLOGY_INTRO, PHILOSOPHY_BODY, PHILOSOPHY_HEADLINE } from "@/lib/air/copy/methodology-explainers";

export default function AirMethodologyPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-xl bg-[#1C1C1A] p-8 text-[#FAF7F0]">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C5BE9F]">Bridge AIR</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold">{METHODOLOGY_HEADLINE}</h1>
        <p className="mt-4 max-w-3xl text-[#D9D5C8]">{METHODOLOGY_INTRO}</p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-2xl font-bold">{AIR_SCORE_HEADLINE}</h2>
          <p className="mt-3 text-muted-foreground">{AIR_SCORE_INTRO}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-2xl font-bold">{PHILOSOPHY_HEADLINE}</h2>
          <p className="mt-3 text-muted-foreground">{PHILOSOPHY_BODY}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">The five domains</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(AIR_DOMAINS) as Array<keyof typeof AIR_DOMAINS>).map((domain) => {
            const copy = DOMAIN_DESCRIPTIONS[domain];
            return (
              <article key={domain} className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{AIR_DOMAINS[domain].label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{copy.short}</p>
                <p className="mt-3 text-sm">{copy.whyItMatters}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Threshold bands</h2>
        <div className="space-y-3">
          {(Object.keys(AIR_BANDS) as Array<keyof typeof AIR_BANDS>).map((band) => (
            <div key={band} className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold">{BAND_DESCRIPTIONS[band].label}</h3>
                <span className="text-sm font-medium">{AIR_BANDS[band].scoreMin}-{AIR_BANDS[band].scoreMax}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{BAND_DESCRIPTIONS[band].longInterpretation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Offering tiers</h2>
        <div className="grid gap-4 lg:grid-cols-5">
          {AIR_TIER_CONFIGS.map((tier) => (
            <div key={tier.id} className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold">{tier.displayName}</h3>
              <p className="mt-1 text-sm font-medium text-primary">{tier.priceDisplay}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {FAQ_ITEMS.map((item) => (
            <article key={item.q} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
