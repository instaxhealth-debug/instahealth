"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const promoImages = [
  {
    src: "/ADS for Insta Health/3.png",
    alt: "Promotional banner 1",
  },
  {
    src: "/ADS for Insta Health/4.png",
    alt: "Promotional banner 2",
  },
  {
    src: "/ADS for Insta Health/5.png",
    alt: "Promotional banner 3",
  },
];

export function PromoBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % promoImages.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg mb-8">
      <div className="relative h-[160px] md:h-[240px] bg-gray-100">
        {/* Single image display - only current image rendered */}
        <Image
          src={promoImages[currentIndex].src}
          alt={promoImages[currentIndex].alt}
          fill
          className="object-cover"
          priority={currentIndex === 0}
          sizes="(max-width: 768px) 100vw, 1200px"
        />

        {/* Navigation arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5 text-gray-800" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5 text-gray-800" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {promoImages.map((_, index) => (
            <button
              key={`dot-${index}`}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
