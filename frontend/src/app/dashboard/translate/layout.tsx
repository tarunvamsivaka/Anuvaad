import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translator Workspace",
  description: "Translate legacy code to plain English, or convert seamlessly between 35+ programming languages in the Anuvaad intelligent workspace.",
};

export default function TranslateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
