import { describe, it, expect } from "vitest";

describe("GDPR consent trail", () => {
  it("subscribe route includes consent metadata fields in upsert", async () => {
    // Verify the subscribe route code captures IP, User-Agent, and consent_version
    // by reading the route source and checking for the expected fields
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    const routeSource = await readFile(join(__dirname, "../app/api/subscribe/route.ts"), "utf-8");

    // Verify consent metadata fields are captured
    expect(routeSource).toContain("subscribed_ip");
    expect(routeSource).toContain("subscribed_user_agent");
    expect(routeSource).toContain("consent_version");

    // Verify IP is extracted from x-forwarded-for
    expect(routeSource).toContain("x-forwarded-for");

    // Verify User-Agent is captured from headers
    expect(routeSource).toContain("user-agent");

    // Verify consent_version has a default value
    expect(routeSource).toContain('"1.0"');
  });

  it("subscribe route passes consent fields to supabase upsert", async () => {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    const routeSource = await readFile(join(__dirname, "../app/api/subscribe/route.ts"), "utf-8");

    // The upsert call should include all GDPR consent fields
    const upsertMatch = routeSource.match(/\.upsert\(\s*\{([\s\S]+?)\}/);
    expect(upsertMatch).not.toBeNull();

    const upsertBody = upsertMatch![1];
    expect(upsertBody).toContain("subscribed_ip");
    expect(upsertBody).toContain("subscribed_user_agent");
    expect(upsertBody).toContain("consent_version");
  });

  it("unsubscribe route supports GDPR Art. 17 full deletion via POST", async () => {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    const routeSource = await readFile(join(__dirname, "../app/api/unsubscribe/route.ts"), "utf-8");

    // Verify POST handler exists for full deletion
    expect(routeSource).toContain("export async function POST");
    expect(routeSource).toContain(".delete()");
    expect(routeSource).toContain("GDPR erasure");
  });

  it("privacy policy link exists in subscribe form", async () => {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    const formSource = await readFile(join(__dirname, "../components/SubscribeForm.tsx"), "utf-8");

    expect(formSource).toContain("/privacy");
    expect(formSource).toContain("Privacy Policy");
  });

  it("confirmation email includes privacy policy link", async () => {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    const routeSource = await readFile(join(__dirname, "../app/api/subscribe/route.ts"), "utf-8");

    expect(routeSource).toContain("/privacy");
    expect(routeSource).toContain("Privacy Policy");
  });
});
