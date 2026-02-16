"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const promoImages = [
  {
    src: "/ADS for Insta Health/3.png",
    desktopSrc: "/ADS for Insta Health/InstaConsultz - web Version ad.png",
    alt: "InstaHealth - Your health marketplace",
  },
  {
    src: "/ADS for Insta Health/4.png",
    desktopSrc: "/ADS for Insta Health/InstaConsultz - web Version ad.png",
    alt: "InstaHealth promotional banner",
  },
  {
    src: "/ADS for Insta Health/5.png",
    desktopSrc: "/ADS for Insta Health/InstaConsultz - web Version ad.png",
    alt: "InstaHealth services",
  },
];

export function PromoBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance carousel every 4.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promoImages.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg mb-8">
      <div className="relative h-[160px] md:h-[240px] bg-gray-100">
        {/* Single image display - only current image rendered */}
        <Image
          src={promoImages[currentIndex].src}
          alt={promoImages[currentIndex].alt}
          fill
          className="object-cover md:hidden"
          priority={currentIndex === 0}
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <Image
          src={promoImages[currentIndex].desktopSrc || promoImages[currentIndex].src}
          alt={promoImages[currentIndex].alt}
          fill
          className="hidden object-cover md:block"
          priority={currentIndex === 0}
          sizes="(max-width: 768px) 100vw, 1200px"
        />
      </div>
    </div>
  );
}
