import Image from "next/image";
import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";

export default function BlogsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-semibold">Recent Posts</h1>

      <div className="grid gap-8 md:grid-cols-2">
        {blogPosts.map((post) => (
          <article key={post.slug} className="border border-gray-100 bg-white">
            <Link href={`/blogs/${post.slug}`} className="block group ">
              <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="px-6 py-5 text-center">
                <p className="text-[11px] text-gray-500">
                  By {post.author} on {post.date}
                </p>

                <h2 className="mt-3 text-base font-semibold leading-6">
                  {post.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {post.excerpt}
                </p>

                <span className="mt-4 inline-block text-xs font-semibold uppercase">
                  Read More
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
