import Image from "next/image";
import Link from "next/link";

const collections = [
  {
    title: "NORTH STAR CURATED",
    description:
      "Here goes the trendiest lifestyle sneakers to redefine all your moves! Ensuring a look brimming with coolness.",
    image: "/homepage/collections/north-star-curated.jpg",
    href: "/products?q=North%20Star",
  },
  {
    title: "MENS CASUAL",
    description:
      "Discover premium men's casual footwear, ensuring confidence and effortless elegance for every occasion.",
    image: "/homepage/collections/mens-casual.jpg",
    href: "/products?gender=men&q=casual",
  },
];

export default function CollectionTiles() {
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
        <h2 className="mb-8 text-xl font-medium uppercase tracking-tight md:text-2xl">
          Our Hand Picked Collection For You
        </h2>

        <div className="grid gap-8 md:grid-cols-2 md:gap-5">
          {collections.map((collection) => (
            <article key={collection.title} className="relative">
              <Link href={collection.href} className="group block">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Image
                    src={collection.image}
                    alt={collection.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>

                {/* Caption panel overlaps image bottom like reference */}
                <div className="relative z-10 mx-8 -mt-3 border border-gray-100 bg-white px-5 py-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.06)] md:mx-12">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-gray-800">
                    {collection.title}
                  </h3>

                  <p className="mx-auto mt-4 max-w-xl text-[11px] leading-4 text-gray-600">
                    {collection.description}
                  </p>

                  <span className="mt-4 inline-block text-xs font-semibold uppercase text-black">
                    Shop Now
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
