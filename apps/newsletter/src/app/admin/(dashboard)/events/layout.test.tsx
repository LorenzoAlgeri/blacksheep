import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";

const savedFlag = process.env.BLACKSHEEP_LIST_ENABLED;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (savedFlag === undefined) {
    delete process.env.BLACKSHEEP_LIST_ENABLED;
  } else {
    process.env.BLACKSHEEP_LIST_ENABLED = savedFlag;
  }
});

describe("EventsAdminLayout — feature flag gating", () => {
  it("redirects to /admin?notice=feature_disabled when flag is off", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "false";
    vi.resetModules();
    const { default: Layout } = await import("./layout");
    Layout({ children: null });
    expect(redirect).toHaveBeenCalledWith("/admin?notice=feature_disabled");
  });

  it("redirects when flag env var is unset", async () => {
    delete process.env.BLACKSHEEP_LIST_ENABLED;
    vi.resetModules();
    const { default: Layout } = await import("./layout");
    Layout({ children: null });
    expect(redirect).toHaveBeenCalledWith("/admin?notice=feature_disabled");
  });

  it("does not redirect when flag is on", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "true";
    vi.resetModules();
    const { default: Layout } = await import("./layout");
    Layout({ children: null });
    expect(redirect).not.toHaveBeenCalled();
  });
});
