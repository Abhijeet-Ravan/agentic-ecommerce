import HeroCarousel from "@/components/home/HeroCarousel";
import CategoryTiles from "@/components/home/CategoryTiles";
import ProductSection from "@/components/home/ProductSection";
import PromoBanner from "@/components/home/PromoBanner";
import CollectionTiles from "@/components/home/CollectionTiles";
import BlogSection from "@/components/home/BlogSection";
import SocialGallery from "@/components/home/SocialGallery";
import FavouritesSection from "@/components/home/FavouritesSection";
import RecommendationSection from "@/components/home/RecommendationSection";
import homepageProducts from "@/data/homepage-products.json";
import { getProduct } from "@/lib/commerce/getProduct";

function getHomepageProducts(section: string) {
  return homepageProducts
    .filter((entry) => entry.homepageSections.includes(section))
    .flatMap((entry) => {
      const product = getProduct(entry.slug);
      return product ? [product] : [];
    });
}

const bestSellers = getHomepageProducts("best-seller");
const featuredProducts = getHomepageProducts("featured-products");
const justLanded = getHomepageProducts("just-landed-casuals");

export default function Home() {
  return (
    <main data-agni-page="home">
      <HeroCarousel />

      <CategoryTiles />

      <ProductSection
        title="Best Sellers"
        eyebrow="Most loved"
        products={bestSellers}
      />

      <PromoBanner />

      <ProductSection
        title="Featured Products"
        eyebrow="Explore more"
        products={featuredProducts}
      />

      <CollectionTiles />

      <ProductSection
        title="Just Landed Casuals"
        eyebrow="New arrivals"
        products={justLanded}
        viewAllHref="/products?gender=men&q=casual"
      />

      <RecommendationSection />

      <FavouritesSection />

      <BlogSection />

      <SocialGallery />
    </main>
  );
}
