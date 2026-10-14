import { describe, expect, it } from "vitest";
import { getHttpFailureMessage } from "@/features/translate/_hooks/translationErrors";

describe("translation request failures", () => {
  it("gives actionable sign-in and input guidance", () => {
    expect(getHttpFailureMessage(401)).toContain("Sign in again");
    expect(getHttpFailureMessage(413)).toContain("Shorten it");
    expect(getHttpFailureMessage(422)).toContain("check your input");
  });

  it("keeps provider failures understandable without exposing response details", () => {
    const message = getHttpFailureMessage(503);

    expect(message).toContain("temporarily unavailable");
    expect(message).not.toContain("503");
    expect(message).not.toContain("provider");
  });

  it("uses a safe fallback for unknown response codes", () => {
    expect(getHttpFailureMessage(418)).toBe(
      "The request could not be completed. Your input is still here; try again.",
    );
  });
});
