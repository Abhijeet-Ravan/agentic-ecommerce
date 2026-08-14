import Image from "next/image";
import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";

export default function BlogSection() {
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
        <h2 className="mb-8 text-xl font-medium tracking-tight md:text-2xl">
          Recent Posts
        </h2>

        <div className="grid gap-8 md:grid-cols-2 md:gap-5">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              // no border please
              className=" bg-white text-center"
            >
              <Link href={`/blogs/${post.slug}`} className="block group ">
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="px-6 py-5">
                  <p className="text-[10px] text-gray-400">
                    By {post.author} on {post.date}
                  </p>

                  <h3 className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-5">
                    {post.title}
                  </h3>

                  <p className="mx-auto mt-3 max-w-xl text-[11px] leading-4 text-gray-600">
                    {post.excerpt}
                  </p>

                  <span className="mt-5 inline-block text-xs font-semibold uppercase">
                    Read More
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
