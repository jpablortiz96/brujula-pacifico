"use client";

import { ExternalLink } from "lucide-react";
import type { Citation } from "@/types/agent";

export default function CitationPill({ citation }: { citation: Citation }) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      title={citation.detail || citation.label}
      className="inline-flex items-center gap-1.5 transition-colors group"
      style={{
        border: "1px solid rgb(10 37 64)",
        background: "#fff",
        padding: "4px 10px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        color: "rgb(10 37 64)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgb(244 242 236)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#fff";
      }}
    >
      <ExternalLink size={12} className="flex-shrink-0 text-gov-muted" />
      <span className="truncate" style={{ maxWidth: 220 }}>
        {citation.label}
      </span>
      {citation.detail && (
        <span
          className="gov-mono text-gov-muted hidden sm:inline"
          style={{ fontSize: 10 }}
        >
          · {citation.detail}
        </span>
      )}
    </a>
  );
}
