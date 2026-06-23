"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { navLinks } from "@/lib/site";
import { Logo } from "./Logo";
import { buttonClass } from "./ui/Button";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Estado de autenticação no client (mantém as páginas de marketing estáticas).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Logo />

        {/* Links desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavItem key={link.href} href={link.href} active={pathname === link.href}>
              {link.label}
            </NavItem>
          ))}
          <div className="ml-3">
            {ready &&
              (email ? (
                <AuthChip email={email} onSignOut={signOut} />
              ) : (
                <Link href="/login" className={buttonClass("secondary", "px-4 py-2")}>
                  Entrar
                </Link>
              ))}
          </div>
        </div>

        {/* Botão mobile */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-fg-strong transition-colors hover:bg-card md:hidden"
          aria-label="Abrir menu"
        >
          <MenuIcon />
        </button>
      </nav>

      {/* Drawer mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="absolute right-0 top-0 flex h-full w-72 flex-col gap-2 border-l border-border bg-bg-elev p-6"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mb-4 self-end rounded-lg p-2 text-fg-muted hover:text-fg-strong"
                aria-label="Fechar menu"
              >
                ✕
              </button>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 font-display font-medium transition-colors",
                    pathname === link.href
                      ? "bg-surface text-attention"
                      : "text-fg hover:bg-surface hover:text-fg-strong",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 border-t border-border pt-4">
                {ready &&
                  (email ? (
                    <button
                      type="button"
                      onClick={signOut}
                      className={buttonClass("secondary", "w-full")}
                    >
                      Sair ({email})
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className={buttonClass("primary", "w-full")}
                    >
                      Entrar
                    </Link>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-2 font-mono text-[0.78rem] font-medium uppercase tracking-wide transition-colors",
        active ? "text-attention" : "text-fg hover:text-fg-strong",
      )}
    >
      {children}
    </Link>
  );
}

function AuthChip({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-full border border-border bg-surface/50 py-1 pl-1 pr-3 transition-colors hover:border-cyan"
        title="Meu Desempenho"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-attention text-sm font-bold text-bg">
          {email[0]?.toUpperCase()}
        </span>
        <span className="max-w-[10rem] truncate text-sm text-fg">{email}</span>
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="text-sm text-fg-muted transition-colors hover:text-pink"
      >
        Sair
      </button>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
