import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up for Free",
  description: "Create an Anuvaad account to instantly translate complex codebases into plain English. 10 free translations daily.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
