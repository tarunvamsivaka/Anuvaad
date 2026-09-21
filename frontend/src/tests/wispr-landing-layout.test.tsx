import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  WisprNavbar,
  HeroControlBar,
  EnterpriseSecurity,
  CustomerProof,
  ActionDeck,
  WisprFooter,
  LivePlayground,
  GitPrWorkflowDemo,
  BenchmarkExplorer,
} from "@/components/landing/wispr";
import Home from "@/app/page";

describe("Wispr Flow Landing Architecture & Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WisprNavbar", () => {
    it("renders floating pill navigation with brand logo and version badge", () => {
      render(<WisprNavbar />);
      expect(screen.getByText("Anuvaad")).toBeInTheDocument();
      expect(screen.getByText("v2.0")).toBeInTheDocument();
      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Main Navigation" })).toBeInTheDocument();
    });

    it("renders all 5 section anchor navigation links", () => {
      render(<WisprNavbar />);
      const workbenchLinks = screen.getAllByRole("link", { name: "Workbench" });
      expect(workbenchLinks[0]).toHaveAttribute("href", "#workbench");

      const gitPrLinks = screen.getAllByRole("link", { name: "Git/PR Demo" });
      expect(gitPrLinks[0]).toHaveAttribute("href", "#git-pr");

      const benchmarkLinks = screen.getAllByRole("link", { name: "Benchmarks" });
      expect(benchmarkLinks[0]).toHaveAttribute("href", "#benchmarks");

      const securityLinks = screen.getAllByRole("link", { name: "Security" });
      expect(securityLinks[0]).toHaveAttribute("href", "#security");

      const testimonialLinks = screen.getAllByRole("link", { name: "Testimonials" });
      expect(testimonialLinks[0]).toHaveAttribute("href", "#proof");
    });

    it("calls onSignIn and onGetStarted callbacks when provided", () => {
      const onSignIn = vi.fn();
      const onGetStarted = vi.fn();
      render(<WisprNavbar onSignIn={onSignIn} onGetStarted={onGetStarted} />);

      const signInButtons = screen.getAllByRole("button", { name: "Sign In" });
      const getStartedButtons = screen.getAllByRole("button", { name: /Get Started/i });

      fireEvent.click(signInButtons[0]);
      expect(onSignIn).toHaveBeenCalledTimes(1);

      fireEvent.click(getStartedButtons[0]);
      expect(onGetStarted).toHaveBeenCalledTimes(1);
    });

    it("renders fallback links when callbacks are not provided", () => {
      render(<WisprNavbar />);
      const signInLinks = screen.getAllByRole("link", { name: "Sign In" });
      expect(signInLinks[0]).toHaveAttribute("href", "/signin");

      const getStartedLinks = screen.getAllByRole("link", { name: /Get Started/i });
      expect(getStartedLinks[0]).toHaveAttribute("href", "/signup");
    });

    it("toggles mobile menu drawer on hamburger click and closes on Escape", () => {
      render(<WisprNavbar />);
      const hamburger = screen.getByRole("button", { name: /Open menu/i });
      expect(hamburger).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(hamburger);
      expect(hamburger).toHaveAttribute("aria-expanded", "true");

      // Press Escape to close
      fireEvent.keyDown(window, { key: "Escape" });
      expect(hamburger).toHaveAttribute("aria-expanded", "false");
    });

    it("updates scroll styling when window scrollY changes", () => {
      const { container } = render(<WisprNavbar />);
      const navContainer = container.querySelector("header > div");
      expect(navContainer).toHaveClass("bg-white/80");

      act(() => {
        Object.defineProperty(window, "scrollY", { value: 50, writable: true });
        window.dispatchEvent(new Event("scroll"));
      });

      expect(navContainer).toHaveClass("bg-white/95");
    });
  });

  describe("HeroControlBar", () => {
    it("renders high-impact headline and value proposition", () => {
      render(<HeroControlBar />);
      expect(screen.getByText("Code Intelligence in Motion")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Translate Code to English/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Understand cryptic codebases instantly/i)
      ).toBeInTheDocument();
    });

    it("renders 4 fluid value badges", () => {
      render(<HeroControlBar />);
      expect(screen.getByText("35+ Languages")).toBeInTheDocument();
      expect(screen.getByText("<3s Latency")).toBeInTheDocument();
      expect(screen.getByText("SOC2 Type II")).toBeInTheDocument();
      expect(screen.getByText("Zero Code Storage")).toBeInTheDocument();
    });

    it("triggers onSelectPrompt when clicking preset prompt pills", () => {
      const onSelectPrompt = vi.fn();
      render(<HeroControlBar onSelectPrompt={onSelectPrompt} />);

      const goPreset = screen.getByRole("button", {
        name: "Convert React hook to Go goroutine",
      });
      fireEvent.click(goPreset);

      expect(onSelectPrompt).toHaveBeenCalledWith(
        expect.stringContaining("useEffect polling fetcher"),
        "go"
      );
      expect(screen.getByText(/StartPollWorker/i)).toBeInTheDocument();
    });

    it("triggers onSelectPrompt on custom prompt submission via Enter key", () => {
      const onSelectPrompt = vi.fn();
      render(<HeroControlBar onSelectPrompt={onSelectPrompt} />);

      const input = screen.getByLabelText("Code problem prompt input");
      fireEvent.change(input, {
        target: { value: "Explain Dijkstra shortest path in Rust" },
      });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onSelectPrompt).toHaveBeenCalledWith(
        "Explain Dijkstra shortest path in Rust",
        "auto"
      );
    });

    it("renders instant preview terminal showcase", () => {
      render(<HeroControlBar />);
      expect(
        screen.getByRole("region", {
          name: "Instant code comprehension preview",
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/1.38s Inference/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero Storage Verified/i)).toBeInTheDocument();
    });
  });

  describe("EnterpriseSecurity", () => {
    it("renders #security anchor and section heading", () => {
      render(<EnterpriseSecurity />);
      const heading = screen.getByRole("heading", {
        name: /Privacy by Default/i,
      });
      expect(heading).toBeInTheDocument();
      expect(
        screen.getByText("Enterprise-Grade Security & Governance")
      ).toBeInTheDocument();
    });

    it("renders all 6 enterprise security pillars", () => {
      render(<EnterpriseSecurity />);
      expect(screen.getByText("Zero Code Storage")).toBeInTheDocument();
      expect(screen.getByText("SOC2 Type II Certified")).toBeInTheDocument();
      expect(screen.getByText("HIPAA & GDPR Ready")).toBeInTheDocument();
      expect(
        screen.getByText("TLS 1.3 & AES-256 Encryption")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Single-Tenant VPC & Air-Gap Deployment")
      ).toBeInTheDocument();
      expect(
        screen.getByText("SAML 2.0 & SCIM SSO Provisioning")
      ).toBeInTheDocument();
    });

    it("renders compliance security package CTA", () => {
      render(<EnterpriseSecurity />);
      expect(
        screen.getByText("Need a custom BAA or SOC2 Type II Audit Report?")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Request Demo \+ Security Package/i })
      ).toHaveAttribute("href", "#enterprise-contact");
    });
  });

  describe("CustomerProof", () => {
    it("renders #proof anchor and verified feedback badge", () => {
      render(<CustomerProof />);
      expect(
        screen.getByText("Verified Engineering Feedback")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Loved by Developers/i })
      ).toBeInTheDocument();
    });

    it("renders key adoption metric counters", () => {
      render(<CustomerProof />);
      expect(screen.getByText("78,000+")).toBeInTheDocument();
      expect(screen.getByText("PRs Reviewed")).toBeInTheDocument();
      expect(screen.getByText("99.4%")).toBeInTheDocument();
      expect(screen.getByText("Syntactic Accuracy")).toBeInTheDocument();
      expect(screen.getByText("<1.9s")).toBeInTheDocument();
      expect(screen.getByText("Median Latency")).toBeInTheDocument();
    });

    it("renders company logos wall and developer testimonials", () => {
      render(<CustomerProof />);
      expect(screen.getAllByText("Stripe")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Vercel")[0]).toBeInTheDocument();
      expect(screen.getByText("Alex Chen")).toBeInTheDocument();
      expect(screen.getByText("Sophie Laurent")).toBeInTheDocument();
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });
  });

  describe("ActionDeck", () => {
    it("renders high-contrast CTA card with headline", () => {
      render(<ActionDeck />);
      expect(
        screen.getByText("Ready for Instant Code Comprehension?")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /Transform How Your Engineering Team Reads Code/i,
        })
      ).toBeInTheDocument();
    });

    it("triggers onGetStarted and onBookDemo callbacks when provided", () => {
      const onGetStarted = vi.fn();
      const onBookDemo = vi.fn();
      render(
        <ActionDeck onGetStarted={onGetStarted} onBookDemo={onBookDemo} />
      );

      const getStartedBtn = screen.getByRole("button", {
        name: /Get Started Free/i,
      });
      const bookDemoBtn = screen.getByRole("button", {
        name: /Book Enterprise Demo/i,
      });

      fireEvent.click(getStartedBtn);
      expect(onGetStarted).toHaveBeenCalledTimes(1);

      fireEvent.click(bookDemoBtn);
      expect(onBookDemo).toHaveBeenCalledTimes(1);
    });

    it("copies CLI command to clipboard and shows feedback", () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<ActionDeck />);
      const copyBtn = screen.getByRole("button", {
        name: "Copy CLI command to clipboard",
      });

      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith("npx anuvaad-cli init");
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    it("renders trust checklist items", () => {
      render(<ActionDeck />);
      expect(screen.getByText("10 Free Translations / Day")).toBeInTheDocument();
      expect(screen.getByText("No Credit Card Required")).toBeInTheDocument();
      expect(
        screen.getByText("Zero Code Storage Guarantee")
      ).toBeInTheDocument();
    });
  });

  describe("WisprFooter", () => {
    it("renders semantic footer with brand description and live status", () => {
      render(<WisprFooter />);
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(
        screen.getByText("All Systems Operational · 99.99% Uptime")
      ).toBeInTheDocument();
    });

    it("renders all 4 link columns with safe external link attributes", () => {
      render(<WisprFooter />);
      expect(screen.getByText("Product")).toBeInTheDocument();
      expect(screen.getByText("Resources")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();

      const githubLink = screen.getByRole("link", {
        name: "GitHub Repository",
      });
      expect(githubLink).toHaveAttribute("target", "_blank");
      expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Core Product Module Shells (LivePlayground, GitPrWorkflowDemo, BenchmarkExplorer)", () => {
    it("renders LivePlayground with interactive language and mode controls", () => {
      const onTranslate = vi.fn();
      render(<LivePlayground onTranslate={onTranslate} />);

      expect(
        screen.getByText("Explore Bi-Directional AI Code Comprehension")
      ).toBeInTheDocument();

      const rustTab = screen.getByRole("button", { name: "Rust" });
      fireEvent.click(rustTab);
      expect(screen.getByText(/find_median/i)).toBeInTheDocument();

      const translateBtn = screen.getByRole("button", { name: /Translate/i });
      fireEvent.click(translateBtn);
      expect(onTranslate).toHaveBeenCalled();
    });

    it("renders GitPrWorkflowDemo with interactive file diff tabs", () => {
      const onSelectDiff = vi.fn();
      render(<GitPrWorkflowDemo onSelectDiff={onSelectDiff} />);

      expect(
        screen.getByText("Automate Architectural PR Reviews in Seconds")
      ).toBeInTheDocument();

      const goFileBtn = screen.getByText("src/database/pool_manager.go");
      fireEvent.click(goFileBtn);
      expect(onSelectDiff).toHaveBeenCalledWith("db-pool");
      expect(screen.getByText(/Introduces connection pooling/i)).toBeInTheDocument();
    });

    it("renders BenchmarkExplorer with search and category filtering", () => {
      const onFilter = vi.fn();
      render(<BenchmarkExplorer onFilterLanguage={onFilter} />);

      expect(
        screen.getByText("Multi-Language Latency & Accuracy Matrix")
      ).toBeInTheDocument();

      const searchInput = screen.getByLabelText("Filter programming languages");
      fireEvent.change(searchInput, { target: { value: "Rust" } });
      expect(onFilter).toHaveBeenCalledWith("Rust");
      expect(screen.getByText("1.42s")).toBeInTheDocument();
    });
  });

  describe("Root Landing Page Assembly & Zero Legacy 3D Canvas Cleanse", () => {
    it("renders the root Home page with clean DOM hierarchy and zero Three.js canvas blockers", () => {
      const { container } = render(<Home />);

      // Verify main content landmark exists
      expect(screen.getByRole("main")).toBeInTheDocument();

      // Verify key section anchors exist
      expect(container.querySelector("#playground")).toBeInTheDocument();
      expect(container.querySelector("#workflow")).toBeInTheDocument();
      expect(container.querySelector("#benchmarks")).toBeInTheDocument();
      expect(container.querySelector("#security")).toBeInTheDocument();
      expect(container.querySelector("#proof")).toBeInTheDocument();
      expect(container.querySelector("#cta")).toBeInTheDocument();
      expect(container.querySelector("#footer")).toBeInTheDocument();

      // ZERO 3D WebGL Canvas blockers on root page
      const canvases = container.querySelectorAll("canvas");
      expect(canvases.length).toBe(0);
    });
  });
});
