"use client";

import { useSearchParams } from "next/navigation";
import ChatPanel from "@/components/brujula/ChatPanel";

export default function AgenteChat() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? undefined;
  return <ChatPanel initialQuery={q} />;
}
