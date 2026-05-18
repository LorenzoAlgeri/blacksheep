import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PushOptIn } from "./PushOptIn";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/base-path", () => ({
  basePath: "/newsletter",
}));

// ---------------------------------------------------------------------------
// Browser API helpers
// ---------------------------------------------------------------------------
function setupBrowserAPIs(opts: {
  serviceWorker?: boolean;
  pushManager?: boolean;
  permission?: NotificationPermission;
  existingSubscription?: boolean;
}) {
  const getSubscription = vi.fn(() =>
    Promise.resolve(opts.existingSubscription ? { endpoint: "https://test" } : null),
  );

  if (opts.serviceWorker !== false) {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn(() =>
          Promise.resolve({
            pushManager: {
              subscribe: vi.fn(() =>
                Promise.resolve({
                  toJSON: () => ({
                    endpoint: "https://fcm.googleapis.com/test",
                    keys: { p256dh: "p256dh-key", auth: "auth-key" },
                  }),
                }),
              ),
              getSubscription,
            },
          }),
        ),
        getRegistration: vi.fn(() =>
          Promise.resolve(
            opts.existingSubscription ? { pushManager: { getSubscription } } : undefined,
          ),
        ),
      },
      writable: true,
      configurable: true,
    });
  } else {
    // Delete serviceWorker to make 'serviceWorker' in navigator === false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).serviceWorker;
  }

  if (opts.pushManager !== false) {
    Object.defineProperty(window, "PushManager", {
      value: class PushManager {},
      writable: true,
      configurable: true,
    });
  } else {
    Object.defineProperty(window, "PushManager", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }

  // Notification API
  Object.defineProperty(window, "Notification", {
    value: {
      permission: opts.permission ?? "default",
      requestPermission: vi.fn(() => Promise.resolve("granted")),
    },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PushOptIn", () => {
  it("renders nothing when browser does not support service workers", async () => {
    setupBrowserAPIs({ serviceWorker: false });
    const { container } = render(<PushOptIn />);
    // Wait for useEffect
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders nothing when PushManager is not available", async () => {
    setupBrowserAPIs({ pushManager: false });
    const { container } = render(<PushOptIn />);
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders nothing when notifications are denied", async () => {
    setupBrowserAPIs({ permission: "denied" });
    const { container } = render(<PushOptIn />);
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders 'Notifiche attive' when already subscribed", async () => {
    setupBrowserAPIs({ existingSubscription: true });
    render(<PushOptIn />);
    await vi.waitFor(() => {
      expect(screen.getByText("Notifiche attive")).toBeInTheDocument();
    });
  });

  it("renders 'Attiva notifiche' button when available", async () => {
    setupBrowserAPIs({ existingSubscription: false });
    render(<PushOptIn />);
    await vi.waitFor(() => {
      expect(screen.getByText("Attiva notifiche")).toBeInTheDocument();
    });
  });
});
