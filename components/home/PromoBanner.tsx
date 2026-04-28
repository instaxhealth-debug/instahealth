"use client";

import Image from "next/image";

export function PromoBanner() {
  return (
    <div className="relative w-full h-[260px] md:h-[320px] rounded-xl overflow-hidden">
      <Image
        src="/images/banners/insta-consultz.png"
        alt="Online Doctor Consultations"
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}
