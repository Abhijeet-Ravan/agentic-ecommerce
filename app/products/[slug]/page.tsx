import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import AddToCartButton from "@/components/AddToCartButton";
import ProductSpecifications from "@/components/ProductSpecifications";
import StarRating from "@/components/StarRating";
import ProductSection from "@/components/home/ProductSection";
import { getProduct, getProducts } from "@/lib/commerce/getProduct";
import { recommendProductsForProduct } from "@/lib/commerce/recommendProducts";
import {
  getAverageRating,
  getProductReviews,
  getReviewCount,
} from "@/lib/reviews";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const recommendations = recommendProductsForProduct(product);
  const reviews = getProductReviews(product);
  const averageRating = getAverageRating(reviews);
  const reviewCount = getReviewCount(reviews);
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main
      className="mx-auto max-w-7xl px-6 py-10"
      data-agni-page="product"
      data-agni-slug={product.slug}
    >
      <div className="grid gap-12 md:grid-cols-2">
        {/* LEFT SIDE */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* RIGHT SIDE */}
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>

          <div className="mt-6 space-y-2 text-sm">
            {product.brand && (
              <p>
                <strong>Brand:</strong> {product.brand}
              </p>
            )}

            {product.productCode && (
              <p>
                <strong>Product Code:</strong> {product.productCode}
              </p>
            )}

            <p>
              <strong>Availability:</strong> In stock
            </p>
          </div>

          <p className="mt-6 text-2xl font-semibold">
            Tk {product.price.toLocaleString()}.00
          </p>

          {product.description && (
            <p className="mt-6 text-sm leading-6 text-gray-600">
              {product.description}
            </p>
          )}

          {product.color && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold">Color</p>
              <div className="flex items-center gap-3 text-sm">
                <div
                  className="h-8 w-8 rounded-full border border-gray-300"
                  style={{
                    backgroundColor: product.color.replace(/[\s-]/g, ""),
                  }}
                />
                {product.color}
              </div>
            </div>
          )}

          <div className="mt-10">
            <AddToCartButton productId={product.id} sizes={product.sizes} />
          </div>
        </div>
      </div>

      <ProductSpecifications product={product} />

      <section
        className="mt-16 border-t border-gray-200 pt-10"
        aria-labelledby="product-reviews-heading"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="product-reviews-heading"
              className="text-2xl font-semibold"
            >
              Demo reviews
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Synthetic feedback generated for this demonstration only.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold">
              {averageRating.toFixed(1)}
            </span>
            <div>
              <StarRating
                rating={averageRating}
                className="text-lg"
              />
              <p className="mt-1 text-xs text-gray-500">
                {reviewCount} demo reviews
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">
                    {review.reviewerName}
                  </h3>
                  <StarRating
                    rating={review.rating}
                    className="mt-2 text-sm"
                  />
                </div>
                <time
                  dateTime={review.date}
                  className="shrink-0 text-xs text-gray-500"
                >
                  {dateFormatter.format(new Date(`${review.date}T00:00:00Z`))}
                </time>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {review.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <ProductSection
        title="You May Also Like"
        eyebrow="Recommended for you"
        products={recommendations}
      />
    </main>
  );
}

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}
