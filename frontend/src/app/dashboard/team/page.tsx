"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeamPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/workspace");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
    </div>
  );
}
