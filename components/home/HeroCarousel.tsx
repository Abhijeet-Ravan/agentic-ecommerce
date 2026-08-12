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
  {
    desktop: "/homepage/hero/emi-available-desktop.jpg",
    mobile: "/homepage/hero/emi-available-mobile.jpg",
    alt: "EMI available",
  },
  {
    desktop: "/homepage/hero/mens-sandals-desktop.jpg",
    mobile: "/homepage/hero/mens-sandals-mobile.jpg",
    alt: "Men's sandals",
  },
  {
    desktop: "/homepage/hero/ladies-bags-desktop.jpg",
    mobile: "/homepage/hero/ladies-bags-mobile.jpg",
    alt: "Ladies bags",
  },
  {
    desktop: "/homepage/hero/ballerina-desktop.jpg",
    mobile: "/homepage/hero/ballerina-mobile.jpg",
    alt: "Ballerina collection",
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];

  function showPreviousSlide() {
    setCurrentSlide((current) =>
      current === 0 ? slides.length - 1 : current - 1,
    );
  }

  function showNextSlide() {
    setCurrentSlide((current) =>
      current === slides.length - 1 ? 0 : current + 1,
    );
  }

  return (
    <section
      className="relative overflow-hidden bg-gray-100"
      aria-label="Promotions"
    >
      <picture>
        <source media="(max-width: 767px)" srcSet={slide.mobile} />
        <Image
          key={slide.desktop}
          src={slide.desktop}
          alt={slide.alt}
          width={1920}
          height={700}
          className="block h-auto w-full"
          priority={currentSlide === 0}
        />
      </picture>

      <button
        type="button"
        onClick={showPreviousSlide}
        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl shadow transition hover:bg-white md:left-6 md:h-12 md:w-12"
        aria-label="Previous promotion"
      >
        ←
      </button>

      <button
        type="button"
        onClick={showNextSlide}
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl shadow transition hover:bg-white md:right-6 md:h-12 md:w-12"
        aria-label="Next promotion"
      >
        →
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm md:bottom-5">
        {slides.map((item, index) => (
          <button
            key={item.desktop}
            type="button"
            onClick={() => setCurrentSlide(index)}
            className={`h-2.5 w-2.5 rounded-full border border-white transition ${
              index === currentSlide ? "bg-white" : "bg-transparent"
            }`}
            aria-label={`Show promotion ${index + 1}`}
            aria-current={index === currentSlide ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
