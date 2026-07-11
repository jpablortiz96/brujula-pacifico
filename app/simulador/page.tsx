import GovHeader from "@/components/brujula/GovHeader";
import GovSidebar from "@/components/brujula/GovSidebar";
import SimuladorClient from "./SimuladorClient";

export const metadata = {
  title: "Simulador ¿y si…? — BRÚJULA · Inteligencia Territorial",
};

export default function SimuladorPage() {
  return (
    <div className="h-screen flex flex-col bg-gov-bone overflow-hidden">
      <GovHeader />
      <div className="flex flex-1 overflow-hidden">
        <GovSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          <SimuladorClient />
        </main>
      </div>
    </div>
  );
}
