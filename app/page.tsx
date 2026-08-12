import HeroCarousel from "@/components/home/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import CategoryTiles from "@/components/home/CategoryTiles";
import homepageProducts from "@/data/homepage-products.json";
import { getProduct } from "@/lib/commerce/getProduct";

const bestSellers = homepageProducts
  .filter((product) => product.homepageSections.includes("best-seller"))
  .map((product) => getProduct(product.slug))
  .filter((product) => product !== undefined)
  .slice(0, 4);

export default function Home() {
  return (
    <main>
      <HeroCarousel />

      <CategoryTiles />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">Best Seller</h2>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
