"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { quotes } from "@/lib/site";
import { cn } from "@/lib/utils";

export function QuoteCarousel() {
  const [index, setIndex] = useState(0);
  const total = quotes.length;

  const next = () => setIndex((v) => (v + 1) % total);
  const prev = () => setIndex((v) => (v - 1 + total) % total);

  // Auto-avanço (pausa se o usuário prefere menos movimento é tratado via CSS).
  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl select-none px-5 py-10 text-center">
      <motion.div
        className="flex h-24 cursor-grab items-center justify-center active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, info) => {
          if (info.offset.x < -60) next();
          else if (info.offset.x > 60) prev();
        }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            className="font-display text-xl font-semibold text-fg-strong sm:text-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <span className="text-attention">“</span>
            {quotes[index]}
            <span className="text-attention">”</span>
          </motion.p>
        </AnimatePresence>
      </motion.div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {quotes.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ir para a frase ${i + 1}`}
            className={cn(
              "h-2 rounded-full transition-all",
              i === index ? "w-6 bg-attention" : "w-2 bg-border hover:bg-fg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
