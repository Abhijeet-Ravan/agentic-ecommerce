import { Product } from "@/types/product";

export const products: Product[] = [
  {
    id: 1,

    slug: "bata-driver-rubber-loafer",

    name: "Bata DRIVER Rubber Loafer",
    brand: "Bata",
    productCode: "8526225",

    price: 599,

    gender: "men",
    category: "loafer",
    material: "rubber",
    color: "black",

    sizes: [6, 7, 8, 9, 10],

    images: [
      "/products/bata-driver-rubber-loafer/1.webp",
      "/products/bata-driver-rubber-loafer/2.webp",
      "/products/bata-driver-rubber-loafer/3.webp",
      "/products/bata-driver-rubber-loafer/4.webp",
      "/products/bata-driver-rubber-loafer/5.webp",
    ],

    description:
      "A men's rubber loafer by Bata designed for comfortable everyday wear.",
  },
];
