"use client";

import dynamic from "next/dynamic";

const LandingV2 = dynamic(
  () =>
    import("@/features/landing/LandingExperience").then((m) => ({
      default: m.LandingExperience,
    })),
  { loading: () => null, ssr: false }
);

const LandingV1 = dynamic(
  () => import("@/components/landing/LandingV1Page"),
  { loading: () => null, ssr: false }
);

interface LandingWrapperProps {
  showLandingV2: boolean;
}

export default function LandingWrapper({ showLandingV2 }: LandingWrapperProps) {
  return showLandingV2 ? <LandingV2 /> : <LandingV1 />;
}
