import { describe, expect, it } from "vitest";
import { formatChangelogSectionTitle, stripInstallSubsections } from "@/lib/changelog";

describe("changelog helpers", () => {
  describe("formatChangelogSectionTitle", () => {
    it("formats [Unreleased] - YYYY-MM-DD as only the date", () => {
      expect(formatChangelogSectionTitle("[Unreleased] - 2026-02-06")).toBe("2026-02-06");
    });

    it("formats other bracketed labels as date + label", () => {
      expect(formatChangelogSectionTitle("[v1.2.3] - 2026-02-06")).toBe("2026-02-06 · v1.2.3");
    });

    it("removes replacement characters", () => {
      expect(formatChangelogSectionTitle("\uFFFD\uFFFD [Unreleased] - 2026-02-06")).toBe("2026-02-06");
    });
  });

  describe("stripInstallSubsections", () => {
    it("removes Installation/Setup subsection under ### and keeps following subsections", () => {
      const input = [
        "### 🧩 UI / UX",
        "- A",
        "",
        "### 🧰 Installation / Setup",
        "- should be removed",
        "- should be removed",
        "",
        "### 🐛 Behoben",
        "- B",
      ].join("\n");

      const out = stripInstallSubsections(input);
      expect(out).toContain("### 🧩 UI / UX");
      expect(out).toContain("- A");
      expect(out).not.toContain("Installation / Setup");
      expect(out).not.toContain("should be removed");
      expect(out).toContain("### 🐛 Behoben");
      expect(out).toContain("- B");
    });

    it("stops skipping on next ## heading", () => {
      const input = [
        "### Installation",
        "- remove",
        "",
        "## Next",
        "- keep",
      ].join("\n");

      const out = stripInstallSubsections(input);
      expect(out).not.toContain("- remove");
      expect(out).toContain("## Next");
      expect(out).toContain("- keep");
    });
  });
});
