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
    it("renders floating pill navigation with brand logo and AI badge", () => {
      render(<WisprNavbar />);
      expect(screen.getByText("Anuvaad")).toBeInTheDocument();
      expect(screen.getByText("AI")).toBeInTheDocument();
      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Main Navigation" })).toBeInTheDocument();
    });

    it("renders all 5 section anchor navigation links", () => {
      render(<WisprNavbar />);
      const workbenchLinks = screen.getAllByRole("link", { name: "Workbench" });
      expect(workbenchLinks[0]).toHaveAttribute("href", "#workbench");

      const gitPrLinks = screen.getAllByRole("link", { name: "Git/PR Demo" });
      expect(gitPrLinks[0]).toHaveAttribute("href", "#git-pr");

      const benchmarkLinks = screen.getAllByRole("link", { name: "Languages" });
      expect(benchmarkLinks[0]).toHaveAttribute("href", "#benchmarks");

      const securityLinks = screen.getAllByRole("link", { name: "Security" });
      expect(securityLinks[0]).toHaveAttribute("href", "#security");

      const testimonialLinks = screen.getAllByRole("link", { name: "How it works" });
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
      expect(navContainer).toHaveClass("bg-white/0");

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
        screen.getByRole("heading", { name: /Your codebase speaks every language/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Explore code explanations and translations/i)
      ).toBeInTheDocument();
    });

    it("renders 4 fluid value badges", () => {
      render(<HeroControlBar />);
      expect(screen.getByText("35+ Languages")).toBeInTheDocument();
      expect(screen.getAllByText("Latency varies by request")).toHaveLength(2);
      expect(screen.getByText("Audit receipt on supported routes")).toBeInTheDocument();
      expect(screen.queryByText("ZDR Certified")).not.toBeInTheDocument();
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
      expect(screen.getByText(/Sample interaction/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy details/i)).toBeInTheDocument();
    });
  });

  describe("EnterpriseSecurity", () => {
    it("renders #security anchor and section heading", () => {
      render(<EnterpriseSecurity />);
      const heading = screen.getByRole("heading", {
        name: /Security details, without the guesswork/i,
      });
      expect(heading).toBeInTheDocument();
      expect(
        screen.getByText("How Anuvaad handles your work")
      ).toBeInTheDocument();
    });

    it("renders current, code-backed security details without unsupported certification claims", () => {
      render(<EnterpriseSecurity />);
      expect(screen.getByText("Translation audit receipts")).toBeInTheDocument();
      expect(screen.getByText("Run code in the browser")).toBeInTheDocument();
      expect(screen.getByText("Sign in with GitHub")).toBeInTheDocument();
      expect(screen.queryByText(/SOC2 Type II|HIPAA|SAML/i)).not.toBeInTheDocument();
    });

    it("links to the privacy details", () => {
      render(<EnterpriseSecurity />);
      expect(screen.getByRole("link", { name: /Read the privacy page/i })).toHaveAttribute("href", "/privacy");
    });
  });

  describe("CustomerProof", () => {
    it("renders a capability overview instead of unverified customer testimonials", () => {
      render(<CustomerProof />);
      expect(screen.getByRole("heading", { name: /A clearer way into unfamiliar code/i })).toBeInTheDocument();
      expect(screen.getByText("Make the logic legible")).toBeInTheDocument();
      expect(screen.queryByText("Early Access Feedback")).not.toBeInTheDocument();
    });

    it("does not invent adoption or accuracy figures", () => {
      render(<CustomerProof />);
      expect(screen.queryByText(/35,000\+|99\.4%|<1\.9s/)).not.toBeInTheDocument();
      expect(screen.getByRole("list", { name: "Supported programming languages" })).toBeInTheDocument();
    });

    it("renders a static language list without fabricated quotes", () => {
      render(<CustomerProof />);
      expect(screen.getByText("Python")).toBeInTheDocument();
      expect(screen.getByText("Go")).toBeInTheDocument();
      expect(screen.queryByText("Ankit M.")).not.toBeInTheDocument();
    });
  });

  describe("ActionDeck", () => {
    it("renders high-contrast CTA card with headline", () => {
      render(<ActionDeck />);
      expect(
        screen.getByText("Explore the workspace")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /Your codebase shouldn't need a Rosetta Stone/i,
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
        screen.getByText("HMAC-SHA256 Audit Receipts")
      ).toBeInTheDocument();
    });
  });

  describe("WisprFooter", () => {
    it("renders semantic footer without an unverified uptime claim", () => {
      render(<WisprFooter />);
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(screen.getByText(/practical workspace for understanding code/i)).toBeInTheDocument();
      expect(screen.queryByText(/99\.99% Uptime/i)).not.toBeInTheDocument();
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
        screen.getByText("Explore a pull request review flow")
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
        screen.getByText("Find your language.")
      ).toBeInTheDocument();

      const searchInput = screen.getByLabelText("Filter programming languages");
      fireEvent.change(searchInput, { target: { value: "Rust" } });
      expect(onFilter).toHaveBeenCalledWith("Rust");
      expect(screen.getByText("Rust")).toBeInTheDocument();
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
