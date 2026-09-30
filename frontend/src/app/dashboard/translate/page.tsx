import { Suspense } from "react";
import { TranslateFeature } from "@/features/translate";
import { MonacoSkeleton } from "@/components/ui/monaco-skeleton";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translate | Anuvaad",
  description: "Code Translation Workspace",
};

export default function TranslatePage() {
  return (
    <Suspense fallback={
      <div className="h-full flex flex-col gap-4 p-4">
        <MonacoSkeleton lines={20} />
      </div>
    }>
      <TranslateFeature />
    </Suspense>
  );
}
