"use client";

import Image from "next/image";
import { useState } from "react";

type ProductGalleryProps = {
  images: readonly string[];
  productName: string;
};

export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <div>
      <div className="relative aspect-square">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          className="object-contain"
          priority
        />
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {images.map((image, index) => (
          <button
            key={image}
            onClick={() => setSelectedImage(image)}
            className="relative aspect-square border border-gray-200"
          >
            <Image
              src={image}
              alt={`${productName} view ${index + 1}`}
              fill
              className="object-contain"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
