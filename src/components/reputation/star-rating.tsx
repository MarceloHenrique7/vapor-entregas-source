"use client";

export function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex gap-1"
      role="radiogroup"
      aria-label="Nota da avaliação"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className={`rounded-xl p-1 text-4xl leading-none transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-brand/15 ${
            star <= value ? "text-sun" : "text-line"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
