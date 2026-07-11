"use client";

import { RolProvider } from "@/lib/context/RolContext";
import { SidebarProvider } from "@/lib/context/SidebarContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RolProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </RolProvider>
  );
}
