import Image from "next/image";

const socialImages = [
  "/homepage/instagram/carry.jpg",
  "/homepage/instagram/floatz.jpg",
  "/homepage/instagram/north-star.jpg",
  "/homepage/instagram/floatz-sandals.jpg",
  "/homepage/instagram/bata-energy.jpg",
  "/homepage/instagram/ai-shoe.jpg",
  "/homepage/instagram/post-234.jpg",
  "/homepage/instagram/post-43.jpg",
  "/homepage/instagram/comp1.jpg",
  "/homepage/instagram/north-star-1.jpg",
  "/homepage/instagram/post-56.jpg",
];

export default function SocialGallery() {
  return (
    <section className="bg-gray-50 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            Style inspiration
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            The Stride Edit
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {socialImages.map((image, index) => (
            <div
              key={image}
              className={`relative aspect-square overflow-hidden bg-gray-200 ${
                index === 0 ? "sm:col-span-2 sm:row-span-2" : ""
              }`}
            >
              <Image
                src={image}
                alt={`Stride style inspiration ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
                className="object-cover transition duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
