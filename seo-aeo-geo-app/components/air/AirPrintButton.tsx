"use client";

export function AirPrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
      Print this report
    </button>
  );
}
