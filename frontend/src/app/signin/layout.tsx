import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Anuvaad to access your translation history, team workspaces, and custom corporate coding standards.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
