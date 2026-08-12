import Image from "next/image";

const stories = [
  {
    title: "Founder's Day 2025",
    image: "/homepage/blog/founders-day-2025.jpg",
    description: "A look back at a milestone moment and the people behind it.",
  },
  {
    title: "Sneaker Fest 2025",
    image: "/homepage/blog/sneaker-fest-2025.jpg",
    description: "Sneaker culture, new styles and highlights from the season.",
  },
];

export default function BlogSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 md:py-20">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
          Stories
        </p>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          From Stride
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {stories.map((story) => (
          <article key={story.title} className="group">
            <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
              <Image
                src={story.image}
                alt={story.title}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            </div>

            <div className="pt-5">
              <h3 className="text-xl font-semibold">{story.title}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                {story.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
