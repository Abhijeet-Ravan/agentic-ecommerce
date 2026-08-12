"use client";

import Image from "next/image";
import { useState } from "react";

const slides = [
  {
    desktop: "/homepage/hero/up-to-50-percent-desktop.jpg",
    mobile: "/homepage/hero/up-to-50-percent-mobile.jpg",
    alt: "Up to 50 percent off",
  },
  {
    desktop: "/homepage/hero/mens-casuals-desktop.jpg",
    mobile: "/homepage/hero/mens-casuals-mobile.jpg",
    alt: "Men's casual shoes",
  },
  {
    desktop: "/homepage/hero/ladies-sandals-desktop.jpg",
    mobile: "/homepage/hero/ladies-sandals-mobile.jpg",
    alt: "Ladies sandals",
  },
  {
    desktop: "/homepage/hero/floatz-2026-desktop.jpg",
    mobile: "/homepage/hero/floatz-2026-mobile.jpg",
    alt: "Floatz collection",
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = slides[currentSlide];

  function showPreviousSlide() {
    if (currentSlide === 0) {
      setCurrentSlide(slides.length - 1);
    } else {
      setCurrentSlide(currentSlide - 1);
    }
  }

  function showNextSlide() {
    if (currentSlide === slides.length - 1) {
      setCurrentSlide(0);
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  }

  return (
    <section className="relative">
      <picture>
        <source media="(max-width: 767px)" srcSet={slide.mobile} />

        <Image
          src={slide.desktop}
          alt={slide.alt}
          width={1920}
          height={700}
          className="w-full"
          priority
        />
      </picture>

      <button
        onClick={showPreviousSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 px-4 py-3"
        aria-label="Previous slide"
      >
        ←
      </button>

      <button
        onClick={showNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 px-4 py-3"
        aria-label="Next slide"
      >
        →
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 w-2 rounded-full ${
              index === currentSlide ? "bg-black" : "bg-white"
            }`}
            aria-label={`Show slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
