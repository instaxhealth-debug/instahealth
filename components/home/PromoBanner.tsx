"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const promoImages = [
  {
    src: "/homepageads/InstaConsultz-websitead.png",
    alt: "Online Doctor Consultations Made Easy",
  },
  {
    src: "/homepageads/InstaSupz-Websitead.png",
    alt: "Daily Health Essentials - Supplements",
  },
];

export function PromoBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance carousel every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promoImages.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[1200px] h-[200px] mx-auto rounded-xl overflow-hidden">
      <Image
        src={promoImages[currentIndex].src}
        alt={promoImages[currentIndex].alt}
        fill
        className="object-fill"
        priority={currentIndex === 0}
      />
    </div>
  );
}
