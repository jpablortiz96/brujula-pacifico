import GovHeader from "@/components/brujula/GovHeader";
import GovSidebar from "@/components/brujula/GovSidebar";
import MiPlataClient from "./MiPlataClient";

export const metadata = {
  title: "¿En qué se gastó mi plata? — BRÚJULA",
};

export default function MiPlataPage() {
  return (
    <div className="h-screen flex flex-col bg-gov-bone overflow-hidden">
      <GovHeader />
      <div className="flex flex-1 overflow-hidden">
        <GovSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          <MiPlataClient />
        </main>
      </div>
    </div>
  );
}
