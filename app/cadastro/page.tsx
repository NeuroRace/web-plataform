import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { NeuralField } from "@/components/signal/NeuralField";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-20">
      <div className="absolute inset-0 z-0">
        <NeuralField className="h-full w-full opacity-60" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </div>
  );
}
