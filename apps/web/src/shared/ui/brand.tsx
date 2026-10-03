import Image from "next/image";
import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`inline-flex items-center gap-2 text-2xl font-bold tracking-[-.06em] ${inverse ? "text-white" : "text-ink"}`} aria-label="Nutreza, início">
    <Image src="/brand/logo-icon.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" />
    <span>nutreza</span>
  </Link>;
}
