import { Suspense } from "react";
import { TranslateFeature } from "@/features/translate";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translate | Anuvaad",
  description: "Code Translation Workspace",
};

export default function TranslatePage() {
  return (
    <Suspense>
      <TranslateFeature />
    </Suspense>
  );
}
