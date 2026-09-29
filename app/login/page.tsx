import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { NeuralField } from "@/components/signal/NeuralField";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-20">
      <div className="absolute inset-0 z-0">
        <NeuralField className="h-full w-full opacity-60" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
