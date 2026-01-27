"use client";

export function ComplianceDisclaimer() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
      <p className="font-semibold">Important Disclaimer</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Products are not intended to diagnose, treat, cure, or prevent disease.</li>
        <li>For research / professional use where applicable.</li>
        <li>Consult a licensed professional before use.</li>
      </ul>
    </div>
  );
}
