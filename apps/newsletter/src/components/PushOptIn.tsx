"use client";

import { useEffect, useState } from "react";
import { basePath } from "@/lib/base-path";

type PushState = "loading" | "unsupported" | "denied" | "subscribed" | "available";

/**
 * Convert a base64 string to a Uint8Array for applicationServerKey.
 * Handles URL-safe base64 (replace - with +, _ with /).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

export function PushOptIn() {
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  useEffect(() => {
    async function checkState() {
      // Check browser support
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }

      // Check if already denied
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.getRegistration(`${basePath}/sw.js`);
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            setState("subscribed");
            return;
          }
        }
      } catch {
        // Ignore — fall through to "available"
      }

      setState("available");
    }
    checkState();
  }, []);

  async function handleSubscribe() {
    setError(null);
    try {
      const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("Configurazione mancante.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const sub = subscription.toJSON();
      const res = await fetch(`${basePath}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh ?? "",
            auth: sub.keys?.auth ?? "",
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Errore durante l'attivazione.");
        return;
      }

      setState("subscribed");
    } catch (err) {
      console.error("[PushOptIn] Subscribe error:", err);
      setError("Errore durante l'attivazione. Riprova.");
    }
  }

  async function handleUnsubscribe() {
    setError(null);
    setIsUnsubscribing(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${basePath}/sw.js`);
      if (!registration) {
        setState("available");
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setState("available");
        return;
      }

      // Remove from server first, then unsubscribe browser-side
      await fetch(`${basePath}/api/push/subscribe`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setState("available");
    } catch (err) {
      console.error("[PushOptIn] Unsubscribe error:", err);
      setError("Errore durante la disattivazione. Riprova.");
    } finally {
      setIsUnsubscribing(false);
    }
  }

  // Don't render anything for unsupported/loading/denied
  if (state === "loading" || state === "unsupported" || state === "denied") {
    return null;
  }

  if (state === "subscribed") {
    return (
      <div className="flex flex-col items-center gap-1 mt-4">
        <div className="flex items-center justify-center gap-2" role="status" aria-live="polite">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-bs-cream/40"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="font-body text-[10px] text-bs-cream/30 tracking-wider uppercase">
            Notifiche attive
          </span>
          <button
            type="button"
            onClick={handleUnsubscribe}
            disabled={isUnsubscribing}
            aria-label="Disattiva notifiche push"
            className="font-body text-[10px] text-bs-cream/30 hover:text-bs-cream/50 underline underline-offset-2 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUnsubscribing ? "..." : "Disattiva"}
          </button>
        </div>
        {error && (
          <p role="alert" className="font-body text-xs text-bs-burgundy">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-4">
      <button
        type="button"
        onClick={handleSubscribe}
        className="font-body text-[10px] tracking-wider uppercase px-4 py-2 rounded border border-bs-cream/20 text-bs-cream/40 hover:text-bs-cream/60 hover:border-bs-cream/30 transition-colors duration-300 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Attiva notifiche
        </span>
      </button>
      {error && (
        <p role="alert" className="font-body text-xs text-bs-burgundy mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
