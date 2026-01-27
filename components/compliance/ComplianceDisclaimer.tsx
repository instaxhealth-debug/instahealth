"use client";

export function ComplianceDisclaimer() {
  return (
    <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
      <p className="font-semibold text-gray-800">Disclaimer</p>
      <ul className="list-disc pl-4 space-y-1 mt-2">
        <li>Products are not intended to diagnose, treat, cure, or prevent disease.</li>
        <li>For research or professional use where applicable.</li>
        <li>Consult a licensed professional before use.</li>
      </ul>
    </div>
  );
}
