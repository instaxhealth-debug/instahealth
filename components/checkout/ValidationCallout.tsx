"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationCalloutProps {
  message: string;
  variant?: "error" | "warning" | "success";
  className?: string;
}

export function ValidationCallout({
  message,
  variant = "error",
  className,
}: ValidationCalloutProps) {
  const variantStyles = {
    error: {
      container: "bg-red-50 border border-red-200",
      text: "text-red-800",
      icon: "text-red-600",
    },
    warning: {
      container: "bg-amber-50 border border-amber-200",
      text: "text-amber-800",
      icon: "text-amber-600",
    },
    success: {
      container: "bg-green-50 border border-green-200",
      text: "text-green-800",
      icon: "text-green-600",
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-md p-3 flex gap-3 text-sm",
        style.container,
        className
      )}
    >
      <AlertCircle className={cn("h-4 w-4 flex-shrink-0 mt-0.5", style.icon)} />
      <span className={style.text}>{message}</span>
    </div>
  );
}
