"use client";

import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

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
    <div className="w-full bg-white py-6 px-4 border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    index <= currentStepIndex
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : index === currentStepIndex ? (
                    <Circle className="w-5 h-5 fill-current" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium text-gray-700">{step.label}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all ${
                    index < currentStepIndex ? "bg-primary" : "bg-gray-300"
                  }`}
                  style={{ marginBottom: "2.5rem" }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
