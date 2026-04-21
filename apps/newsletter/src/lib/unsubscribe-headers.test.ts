import { describe, expect, it } from "vitest";
import { buildListUnsubscribeHeaders } from "@/lib/unsubscribe-headers";

describe("buildListUnsubscribeHeaders", () => {
  it("builds RFC8058 one-click headers with web and mailto endpoints", () => {
    const headers = buildListUnsubscribeHeaders({
      unsubscribeUrl: "https://example.com/api/unsubscribe?token=abc-123",
      mailtoAddress: "newsletter@example.com",
      mailtoSubjectToken: "abc-123",
    });

    expect(headers["List-Unsubscribe"]).toBe(
      "<https://example.com/api/unsubscribe?token=abc-123>, <mailto:newsletter@example.com?subject=unsubscribe-abc-123>",
    );
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("omits token suffix when mailtoSubjectToken is missing", () => {
    const headers = buildListUnsubscribeHeaders({
      unsubscribeUrl: "https://example.com/api/unsubscribe?token=abc-123",
      mailtoAddress: "newsletter@example.com",
    });

    expect(headers["List-Unsubscribe"]).toBe(
      "<https://example.com/api/unsubscribe?token=abc-123>, <mailto:newsletter@example.com?subject=unsubscribe>",
    );
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});
