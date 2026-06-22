import Link from "next/link";
import Image from "next/image";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 transition-opacity hover:opacity-90"
      aria-label="NeuroRace — início"
    >
      <Image
        src="/assets/images/logo-icon.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8"
        priority
      />
      <span className="font-display text-xl font-extrabold tracking-tight">
        <span className="text-cyan">NEURO</span>
        <span className="text-pink">RACE</span>
      </span>
    </Link>
  );
}
