type StarRatingProps = {
  rating: number;
  label?: string;
  className?: string;
};

export default function StarRating({
  rating,
  label = `${rating} out of 5 stars`,
  className = "",
}: StarRatingProps) {
  const filledStars = Math.round(rating);

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={label}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={index < filledStars ? "text-amber-500" : "text-gray-300"}
        >
          ★
        </span>
      ))}
    </span>
  );
}
