import GovHeader from "@/components/brujula/GovHeader";
import GovSidebar from "@/components/brujula/GovSidebar";
import ZonasClient from "./ZonasClient";

export const metadata = {
  title: "Zonas Olvidadas — BRÚJULA · Inteligencia Territorial",
};

export default function ZonasOlvidadasPage() {
  return (
    <div className="h-screen flex flex-col bg-gov-bone overflow-hidden">
      <GovHeader />
      <div className="flex flex-1 overflow-hidden">
        <GovSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          <ZonasClient />
        </main>
      </div>
    </div>
  );
}
