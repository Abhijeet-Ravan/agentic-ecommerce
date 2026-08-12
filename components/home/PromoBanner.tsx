import Image from "next/image";

export default function PromoBanner() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 md:py-12">
      <div className="overflow-hidden">
        <Image
          src="/homepage/banners/gift-voucher.jpg"
          alt="Gift voucher promotion"
          width={1600}
          height={300}
          className="h-auto w-full object-cover"
        />
      </div>
    </section>
  );
}
