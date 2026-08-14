import Image from "next/image";
import Link from "next/link";

const favourites = [
  {
    eyebrow: "LADIES",
    title: "CASUAL",
    description:
      "Step into our chic collection of casual shoes for women, blending everyday comfort with style.",
    image: "/homepage/collections/ladies-casual.jpg",
    href: "/products?gender=women&q=casual",
  },
  {
    eyebrow: "MENS",
    title: "FORMALS",
    description:
      "Explore refined formal footwear for men, combining comfort, confidence and timeless style.",
    image: "/homepage/collections/mens-formal.jpg",
    href: "/products?gender=men&q=formal",
  },
  {
    eyebrow: "LADIES",
    title: "BAGS",
    description:
      "Discover stylish bags for everyday use, work and occasions with practical, modern designs.",
    image: "/homepage/collections/ladies-bags.jpg",
    href: "/products?gender=women&category=accessories",
  },
];

export default function FavouritesSection() {
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
        <h2 className="mb-8 text-xl font-medium uppercase tracking-tight md:text-2xl">
          Pick Your Favourites
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {favourites.map((item) => (
            <article key={`${item.eyebrow}-${item.title}`}>
              <Link href={item.href} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src={item.image}
                    alt={`${item.eyebrow} ${item.title}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="relative z-10 mx-7 -mt-3 border border-gray-100 bg-white px-5 py-4 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    {item.eyebrow}
                  </p>

                  <h3 className="mt-1 text-sm font-medium uppercase tracking-wide">
                    {item.title}
                  </h3>

                  <p className="mx-auto mt-4 max-w-sm text-[11px] leading-4 text-gray-600">
                    {item.description}
                  </p>

                  <span className="mt-4 inline-block text-xs font-semibold uppercase">
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
