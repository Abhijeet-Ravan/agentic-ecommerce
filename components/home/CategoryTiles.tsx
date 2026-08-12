import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    name: "MEN'S COLLECTION",
    image: "/homepage/categories/men.jpg",
    href: "/products?gender=men",
  },
  {
    name: "WOMEN'S COLLECTION",
    image: "/homepage/categories/women.jpg",
    href: "/products?gender=women",
  },
  {
    name: "KIDS' COLLECTION",
    image: "/homepage/categories/kids.jpg",
    href: "/products?gender=kids",
  },
  {
    name: "ACCESSORIES",
    image: "/homepage/categories/accessories.jpg",
    href: "/products?category=accessories",
  },
];

export default function CategoryTiles() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.name} href={category.href} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <h2 className="mt-4 text-center text-sm font-semibold">
              {category.name}
            </h2>
          </Link>
        ))}
      </div>
    </section>
  );
}
