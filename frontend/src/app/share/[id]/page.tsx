/**
 * frontend/src/app/share/[id]/page.tsx
 *
 * ADD-02 (UX): Converted from client-rendered to server-rendered for Open Graph support.
 * generateMetadata fetches the shared item server-side so social media crawlers
 * (Twitter, Slack, LinkedIn) can read the og:title / og:description meta tags.
 * The interactive Monaco editor part still uses a client component.
 */
import type { Metadata } from "next";
import SharedTranslationClient from "./ShareClient";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchSharedItem(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/share/${id}`, {
      next: { revalidate: 60 }, // cache for 60 s then re-validate
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const item = await fetchSharedItem(params.id);

  if (!item) {
    return {
      title: "Shared Translation | Anuvaad",
      description: "View a code translation shared with Anuvaad AI.",
    };
  }

  const src = (item.source_language as string) ?? "Code";
  const tgt = (item.target_language as string) ?? "English";
  const preview = ((item.input_preview as string) ?? "").slice(0, 120);

  return {
    title: `${src} → ${tgt} | Anuvaad`,
    description: `Code translation shared with Anuvaad AI: ${preview}`,
    openGraph: {
      title: `Code Translation: ${src} → ${tgt}`,
      description: `Translated with Anuvaad AI — ${preview}`,
      url: `${process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://anuvaad.dev"}/share/${params.id}`,
      siteName: "Anuvaad",
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `Code Translation: ${src} → ${tgt}`,
      description: `Translated with Anuvaad AI — ${preview}`,
    },
  };
}

export default function SharedTranslationPage({ params }: { params: { id: string } }) {
  return <SharedTranslationClient id={params.id} />;
}
