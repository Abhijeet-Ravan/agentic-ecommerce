import Image from "next/image";
import Link from "next/link";
import StarRating from "@/components/StarRating";
import {
  getAverageRating,
  getProductReviews,
  getReviewCount,
} from "@/lib/reviews";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const sizes = product.sizes ?? [];
  const visibleSizes = sizes.slice(0, 4);
  const remainingSizes = Math.max(0, sizes.length - visibleSizes.length);
  const reviews = getProductReviews(product);
  const averageRating = getAverageRating(reviews);
  const reviewCount = getReviewCount(reviews);

  return (
    <div className="group relative w-full">
      <Link
        href={`/products/${product.slug}`}
        className="relative z-10 block border border-transparent bg-white px-4 pt-4 group-hover:z-30 group-hover:border-gray-200 group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
      >
        {/* PRODUCT IMAGE */}
        <div className="relative aspect-square">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-contain"
          />

          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt={`${product.name} alternate view`}
              fill
              className="object-contain opacity-0 group-hover:opacity-100"
            />
          )}
        </div>

        {/* HOVER SIZE ROW */}
        <div className="h-7">
          {visibleSizes.length > 0 && (
            <div className="invisible flex h-full items-center justify-center gap-3 text-[10px] text-gray-600 group-hover:visible">
              {visibleSizes.map((size) => (
                <span key={size}>{size}</span>
              ))}

              {remainingSizes > 0 && (
                <span className="font-medium">+{remainingSizes}</span>
              )}
            </div>
          )}
        </div>

        {/* PRODUCT INFORMATION */}
        <div className="text-center">
          <p className="text-[10px] font-normal uppercase text-gray-600">
            {product.brand}
          </p>

          <h2 className="mt-2 min-h-9 text-[10px] font-normal leading-[1.4] text-gray-700">
            {product.name}
          </h2>

          <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-gray-600">
            <StarRating
              rating={averageRating}
              className="text-[9px]"
            />
            <span>
              {averageRating.toFixed(1)} ({reviewCount})
            </span>
          </div>

          <p className="mt-1 pb-4 text-[12px] font-semibold text-black">
            Tk {product.price.toLocaleString()}.00
          </p>
        </div>

        {/* REVEALED LOWER PANEL
            Absolute so surrounding cards/sections do NOT move. */}
        <div className="invisible absolute left-0 right-0 top-full bg-white px-4 pb-5 border-x border-b border-gray-200 shadow-[0_4px_6px_rgba(0,0,0,0.06)] group-hover:visible">
          <div className="flex h-10 items-center justify-center bg-black text-xs font-semibold uppercase tracking-wide text-white">
            Shop Now
          </div>

          <div className="mt-3 flex justify-center">
            <span className="h-3 w-3 rounded-full bg-black" />{" "}
          </div>
        </div>
      </Link>
    </div>
  );
}
