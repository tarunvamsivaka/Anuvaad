import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up for Free",
  description: "Create an Anuvaad account to translate code into plain English and save translation history. Free daily usage limits apply.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
