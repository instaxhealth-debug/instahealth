"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoType = "instahealth" | "pepz" | "ivz" | "bloodz" | "consultz";

interface LogoProps {
  type: LogoType;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

const logoPaths: Record<LogoType, string> = {
  instahealth: "/instahealth.png",
  pepz: "/logos/pepz.png",
  ivz: "/logos/ivz.png",
  bloodz: "/logos/bloodz.png",
  consultz: "/logos/consultz.png",
};

const defaultSizes: Record<LogoType, { width: number; height: number }> = {
  instahealth: { width: 180, height: 40 },
  pepz: { width: 120, height: 40 },
  ivz: { width: 120, height: 40 },
  bloodz: { width: 140, height: 40 },
  consultz: { width: 140, height: 40 },
};

const logoText: Record<LogoType, string> = {
  instahealth: "InstaHealth",
  pepz: "Pepz",
  ivz: "Ivz",
  bloodz: "Bloodz",
  consultz: "Consultz",
};

export function Logo({ type, className, width, height, priority = false }: LogoProps) {
  const logoPath = logoPaths[type];
  const defaultSize = defaultSizes[type];
  const logoWidth = width || defaultSize.width;
  const logoHeight = height || defaultSize.height;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: logoWidth, height: logoHeight }}>
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src={logoPath}
          alt={`${logoText[type]} logo`}
          width={logoWidth}
          height={logoHeight}
          className="object-contain"
          style={{
            filter: type === "instahealth" ? "brightness(1.2) contrast(1.1)" : "none"
          }}
          priority={priority}
          unoptimized
          onError={(e) => {
            // Fallback to text if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent && !parent.querySelector(".logo-fallback")) {
              const fallback = document.createElement("span");
              fallback.className = "logo-fallback text-lg font-bold text-gray-900";
              fallback.textContent = logoText[type];
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
    </div>
  );
}
