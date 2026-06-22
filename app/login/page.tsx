import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-20">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
