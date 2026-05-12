import type { AirSnapshotDeliverable } from "@/lib/air/types";
import { AirDomainGrid } from "./AirDomainGrid";
import { AirScoreDial } from "./AirScoreDial";

export function AirDeliverableSnapshot({ deliverable }: { deliverable: AirSnapshotDeliverable }) {
  return (
    <article className="overflow-hidden rounded-xl border bg-[#FAF7F0] text-[#1C1C1A]">
      <header className="border-b border-[#E8E4DA] bg-[#1C1C1A] px-6 py-5 text-[#FAF7F0]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C5BE9F]">Bridge AIR Snapshot</p>
            <h1 className="text-2xl font-bold">{deliverable.clientName}</h1>
            <p className="text-sm text-[#D9D5C8]">{deliverable.vertical}</p>
          </div>
          <p className="text-xs text-[#D9D5C8]">{deliverable.reportNumber}</p>
        </div>
      </header>

      <section className="grid gap-6 p-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl bg-[#1C1C1A] p-6 text-center">
          <AirScoreDial score={deliverable.composite.composite} band={deliverable.composite.band} size="lg" />
          <p className="mt-4 text-sm text-[#D9D5C8]">{deliverable.composite.bandLabel}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Domain Breakdown</h2>
          <p className="mb-4 text-sm text-[#6B6B66]">
            Snapshot scores use public evidence plus honest defaults where private operational data is not visible.
          </p>
          <AirDomainGrid domains={deliverable.composite.domains} />
        </div>
      </section>

      <section className="grid gap-5 border-t border-[#E8E4DA] p-6 lg:grid-cols-3">
        {deliverable.quickWins.map((win) => (
          <div key={win.rank} className="rounded-lg border border-[#E8E4DA] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[#A89766]">Quick win {win.rank}</p>
            <h3 className="mt-2 font-semibold">{win.title}</h3>
            <p className="mt-2 text-sm text-[#6B6B66]">{win.body}</p>
            <p className="mt-3 text-xs font-semibold">{win.timelineLabel} / {win.effortLabel}</p>
            <p className="mt-1 text-xs text-[#6B6B66]">{win.projectedImpact}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 border-t border-[#E8E4DA] p-6 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold">Observations</h2>
          <div className="mt-3 space-y-3">
            {deliverable.observations.map((observation) => (
              <div key={observation.id} className="rounded-lg bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[#A89766]">{observation.kind}</p>
                <h3 className="mt-1 font-semibold capitalize">{observation.title}</h3>
                {observation.body ? <p className="mt-1 text-sm text-[#6B6B66]">{observation.body}</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold">What public data cannot see</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#6B6B66]">
            {deliverable.whatCannotBeSeen.map((item) => (
              <li key={item} className="rounded-lg bg-white px-4 py-3">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-[#E8E4DA] bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href={deliverable.ctaPrimary.href} className="rounded-lg bg-[#1C1C1A] px-4 py-2 text-center text-sm font-semibold text-white">
            {deliverable.ctaPrimary.label}
          </a>
          <a href={deliverable.ctaSecondary.href} className="rounded-lg border border-[#E8E4DA] px-4 py-2 text-center text-sm font-semibold">
            {deliverable.ctaSecondary.label}
          </a>
        </div>
      </footer>
    </article>
  );
}
