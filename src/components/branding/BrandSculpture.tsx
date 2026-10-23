import { BrandMark } from "./Logo";

/** CSS depth keeps this brand detail lightweight on authentication screens. */
export function BrandSculpture({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-sculpture ${className}`} aria-hidden="true">
      <div className="brand-sculpture-stack">
        <span className="brand-slab brand-slab-back" />
        <span className="brand-slab brand-slab-middle" />
        <span className="brand-slab brand-slab-front">
          <BrandMark className="h-full w-full" />
        </span>
      </div>
    </div>
  );
}
