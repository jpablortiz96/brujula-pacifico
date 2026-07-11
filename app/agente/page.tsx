import { Suspense } from "react";
import GovHeader from "@/components/brujula/GovHeader";
import GovSidebar from "@/components/brujula/GovSidebar";
import AgenteChat from "./AgenteChat";

export const metadata = {
  title: "Copiloto IA — BRÚJULA · Inteligencia Territorial",
};

export default function AgentePage() {
  return (
    <div className="h-screen flex flex-col bg-gov-bone overflow-hidden">
      <GovHeader />
      <div className="flex flex-1 overflow-hidden">
        <GovSidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <Suspense fallback={null}>
            <AgenteChat />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
