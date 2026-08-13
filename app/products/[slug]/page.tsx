import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import AddToCartButton from "@/components/AddToCartButton";
import { getProduct, getProducts } from "@/lib/commerce/getProduct";

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
    </main>
  );
}

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}
