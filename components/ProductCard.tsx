import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block w-full max-w-sm"
    >
      <div className="relative aspect-square">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-contain transition-opacity duration-300 group-hover:opacity-0"
        />

        {product.images[1] && (
          <Image
            src={product.images[1]}
            alt={`${product.name} alternate view`}
            fill
            className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </div>

      <p className="mt-3 text-xs uppercase">{product.brand}</p>

      <h2 className="mt-1 text-sm">{product.name}</h2>

      <p className="mt-1 font-semibold">
        Tk {product.price.toLocaleString()}.00
      </p>
    </Link>
  );
}
