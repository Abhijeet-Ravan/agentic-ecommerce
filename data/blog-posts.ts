export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  author: string;
  content: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "founders-day-2025",
    title: "Bata Marks Founder's Day 2025 With Global Commitment To Moving Forward Together",
    excerpt:
      "A look back at a milestone moment and the people behind it.",
    date: "September 24, 2025",
    category: "Bata News",
    image: "/homepage/blog/founders-day-2025.jpg",
    author: "Bata Bangladesh",
    content: [
      "Founder's Day 2025 was marked as a moment of reflection, celebration and shared progress.",
      "The event highlighted the people, teams and communities that continue to shape the brand's journey.",
      "It was also an opportunity to look ahead and reinforce the commitment to moving forward together.",
    ],
  },
  {
    slug: "sneaker-fest-2025",
    title: "Step Into The Sneakerverse With Bata's Sneaker Fest 2025!",
    excerpt:
      "Sneaker culture, new styles and highlights from the season.",
    date: "December 24, 2024",
    category: "Brand Stories",
    image: "/homepage/blog/sneaker-fest-2025.jpg",
    author: "Bata Bangladesh",
    content: [
      "Sneaker Fest brings together lifestyle, sport and everyday footwear in one seasonal showcase.",
      "The collection focuses on versatile sneakers for men, women and kids across a range of styles.",
      "From casual silhouettes to sport-inspired designs, the range is built around comfort and everyday wear.",
    ],
  },
];
