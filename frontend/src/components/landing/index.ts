/**
 * Landing Page Components - Barrel Export
 * Re-exports modern Wispr Flow components and preserves legacy component contracts.
 */

// ============================================================================
// Wispr Flow Modern Components (Primary Milestone 2 Architecture)
// ============================================================================
export { WisprNavbar, type WisprNavbarProps, NAV_LINKS } from "./wispr/WisprNavbar";
export { HeroControlBar, type HeroControlBarProps, HERO_PROMPT_PRESETS, type PromptPreset } from "./wispr/HeroControlBar";
export { LivePlayground, type LivePlaygroundProps } from "./wispr/LivePlayground";
export { GitPrWorkflowDemo, type GitPrWorkflowDemoProps } from "./wispr/GitPrWorkflowDemo";
export { BenchmarkExplorer, type BenchmarkExplorerProps, BENCHMARK_DATA, type LanguageBenchmark } from "./wispr/BenchmarkExplorer";
export { EnterpriseSecurity, type EnterpriseSecurityProps, ENTERPRISE_SECURITY_PILLARS, type SecurityPillar } from "./wispr/EnterpriseSecurity";
export { CustomerProof, type CustomerProofProps, TESTIMONIALS_DATA, COMPANY_LOGOS, type TestimonialItem } from "./wispr/CustomerProof";
export { ActionDeck, type ActionDeckProps } from "./wispr/ActionDeck";
export { WisprFooter, type WisprFooterProps } from "./wispr/WisprFooter";

// ============================================================================
// Legacy Components & Data Contracts (Preserved for Test Suite Compatibility)
// ============================================================================
export { Hero } from "./hero";
export { Features } from "./features";
export { Navbar } from "./navbar";
export { Footer } from "./footer";
export { FAQ, FAQS, faqs } from "./faq";
export { StatsBanner, STATS } from "./StatsBanner";
export { Testimonials, TESTIMONIALS } from "./testimonials";
export { Positioning } from "./Positioning";
export { Trust } from "./Trust";
export { FinalCTA } from "./FinalCTA";
export { TransformationDemo } from "./TransformationDemo";
export { ExitIntentModal } from "./ExitIntentModal";
export { LenisScrollProvider, useLenis } from "./LenisScrollProvider";
export { Logo } from "./Logo";
export { ScrollStory } from "./ScrollStory";
export { SmoothScroll } from "./SmoothScroll";
export { WebGLCanvas } from "./WebGLCanvas";
export { WebGLScrollProvider } from "./WebGLScrollProvider";
export { default as LandingWrapper } from "./LandingWrapper";
export { default as LandingV1Page } from "./LandingV1Page";
