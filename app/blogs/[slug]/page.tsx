import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/data/blog-posts";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6">
      <div className="mb-6 text-xs text-gray-500">
        <Link href="/">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/blogs">Brand Stories</Link>
        <span className="mx-2">›</span>
        <span>{post.title}</span>
      </div>

      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <aside>
          <h2 className="border-b pb-2 text-sm font-semibold uppercase">
            Categories
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <p>All</p>
            <p>Shoe Care</p>
            <p>Brand Stories</p>
            <p>Know-How</p>
            <p>Fashion & Trends</p>
            <p>Bata News</p>
          </div>

          <h2 className="mt-10 border-b pb-2 text-sm font-semibold uppercase">
            Recent Articles
          </h2>

          <div className="mt-4 space-y-5">
            {blogPosts.map((item) => (
              <Link
                key={item.slug}
                href={`/blogs/${item.slug}`}
                className="block text-xs leading-5"
              >
                {item.title}
                <span className="mt-1 block text-[10px] text-gray-500">
                  {item.date}
                </span>
              </Link>
            ))}
          </div>
        </aside>

        <article>
          <p className="text-xs font-medium uppercase text-gray-500">
            {post.category}
          </p>

          <h1 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
            {post.title}
          </h1>

          <p className="mt-2 text-xs text-gray-500">
            {post.date} / Post by {post.author}
          </p>

          <div className="relative mt-7 aspect-[16/8] overflow-hidden bg-gray-100">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="mt-6 space-y-5 text-sm leading-7 text-gray-700">
            {post.content.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <h2 className="mt-8 text-xl font-semibold">
            Explore More From Stride
          </h2>
        </article>
      </div>
    </main>
  );
}
