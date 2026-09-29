import Link from "next/link";
import Image from "next/image";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 group"
      aria-label="NeuroRace — início"
    >
      <Image
        src="/assets/images/logo-icon.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3"
        priority
      />
      <span className="relative">
        <span className="font-display text-xl font-extrabold tracking-tight">
          <span className="text-fg-strong transition-colors duration-300 group-hover:text-attention">NEURO</span>
          <span className="text-attention">RACE</span>
        </span>
        <span 
          className="absolute left-0 right-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-attention transition-transform duration-300 ease-out group-hover:scale-x-100" 
        />
      </span>
    </Link>
  );
}
