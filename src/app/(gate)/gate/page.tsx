import type { Metadata } from "next";
import { GateForm } from "@/components/gate/gate-form";

export const metadata: Metadata = {
  title: "LinkForge — Sign in",
};

export default function GatePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <GateForm />
    </main>
  );
}
