import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translator Workspace",
  description: "Explain code in plain English, generate code from a description, or translate between programming languages. Parser and syntax-check coverage varies by language.",
};

export default function TranslateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
