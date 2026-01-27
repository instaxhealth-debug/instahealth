"use client";

import { useState } from "react";
import { fixProductVisibility } from "./actions";

export function FixVisibilityButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);

  const handleFix = async () => {
    setLoading(true);
    try {
      const res = await fixProductVisibility();
      setResult(res);
    } catch (err) {
      console.error("Failed to fix products", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-green-700">
          ✓ Fixed {result.count} products
        </span>
      )}
      <button
        onClick={handleFix}
        disabled={loading}
        className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? "Fixing..." : "Fix All → Set isGlobal=true"}
      </button>
    </div>
  );
}
