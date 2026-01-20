import { describe, expect, it } from "vitest";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

describe("normalizeUploadedImageUrl", () => {
  it("returns null for empty inputs", () => {
    expect(normalizeUploadedImageUrl(undefined)).toBeNull();
    expect(normalizeUploadedImageUrl(null)).toBeNull();
    expect(normalizeUploadedImageUrl("")).toBeNull();
    expect(normalizeUploadedImageUrl("   ")).toBeNull();
  });

  it("keeps absolute URLs", () => {
    expect(normalizeUploadedImageUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(normalizeUploadedImageUrl("http://example.com/a.jpg")).toBe("http://example.com/a.jpg");
  });

  it("keeps /uploads prefix", () => {
    expect(normalizeUploadedImageUrl("/uploads/a.jpg")).toBe("/uploads/a.jpg");
  });

  it("adds leading slash for uploads/ prefix", () => {
    expect(normalizeUploadedImageUrl("uploads/a.jpg")).toBe("/uploads/a.jpg");
  });

  it("treats bare filenames as uploads", () => {
    expect(normalizeUploadedImageUrl("a.jpg")).toBe("/uploads/a.jpg");
    expect(normalizeUploadedImageUrl("c221c078-7546.jpg")).toBe("/uploads/c221c078-7546.jpg");
  });
});
