"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

export type CheckoutStep = "cart" | "shipping" | "payment" | "confirmation";

interface CheckoutProgressProps {
  currentStep: CheckoutStep;
}

const steps: { id: CheckoutStep; label: string; description: string }[] = [
  { id: "cart", label: "Cart", description: "Review items" },
  { id: "shipping", label: "Shipping", description: "Address & details" },
  { id: "payment", label: "Payment", description: "Complete payment" },
  { id: "confirmation", label: "Confirmation", description: "Order placed" },
];

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white py-6 sticky top-0 z-10 border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
                      index <= currentStepIndex
                        ? "bg-[#41a59b] border-[#41a59b] text-white shadow-sm"
                        : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center hidden md:block">
                    <p className="text-xs font-semibold text-gray-800">{step.label}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  <div className="mt-2 text-center md:hidden">
                    <p className="text-xs font-semibold text-gray-800">{step.label}</p>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      index < currentStepIndex ? "bg-[#41a59b]" : "bg-gray-200"
                    }`}
                    style={{ marginBottom: "3rem" }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
