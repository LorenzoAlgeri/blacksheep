import { useState, useEffect, useCallback } from "react";
import { basePath } from "@/lib/base-path";

export function useEmailSender() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("18:00");

  // Load subscriber count
  useEffect(() => {
    fetch(`${basePath}/api/admin/subscribers`)
      .then((r) => r.json())
      .then((data) => {
        if (data.subscribers) {
          const confirmed = data.subscribers.filter(
            (s: { status: string }) => s.status === "confirmed",
          ).length;
          setSubscriberCount(confirmed);
        }
      })
      .catch(() => {});
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  const flashResult = useCallback((msg: string, duration = 2000) => {
    setResult(msg);
    setTimeout(() => setResult(null), duration);
  }, []);

  const handleSend = useCallback(
    async (subject: string, html: string, onSuccess: () => void) => {
      if (!subject.trim()) return;

      const confirmed = window.confirm(
        `Stai per inviare la newsletter "${subject}" a ${subscriberCount ?? "tutti gli"} iscritti confermati. Confermi?`,
      );
      if (!confirmed) return;

      setSending(true);
      setResult(null);

      try {
        const res = await fetch(`${basePath}/api/admin/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, html }),
        });
        const data = await res.json();

        if (!res.ok) {
          setResult(`Errore: ${data.error}`);
        } else {
          setResult(`Inviata a ${data.sent}/${data.total} iscritti.`);
          onSuccess();
        }
      } catch {
        setResult("Errore di rete.");
      } finally {
        setSending(false);
      }
    },
    [subscriberCount],
  );

  const handleSchedule = useCallback(
    async (subject: string, html: string, onSuccess: () => void) => {
      if (!subject.trim()) return;
      if (!scheduleDate || !scheduleTime) {
        setResult("Errore: seleziona data e ora.");
        return;
      }

      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      const confirmed = window.confirm(
        `Programmare l'invio per il ${scheduleDate} alle ${scheduleTime}?`,
      );
      if (!confirmed) return;

      setSending(true);
      setResult(null);

      try {
        const res = await fetch(`${basePath}/api/admin/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, html, scheduledAt }),
        });
        const data = await res.json();

        if (!res.ok) {
          setResult(`Errore: ${data.error}`);
        } else {
          setResult(`Newsletter programmata per ${scheduleDate} alle ${scheduleTime}.`);
          onSuccess();
        }
      } catch {
        setResult("Errore di rete.");
      } finally {
        setSending(false);
      }
    },
    [scheduleDate, scheduleTime],
  );

  return {
    sending,
    result,
    setResult,
    clearResult,
    flashResult,
    subscriberCount,
    showSchedule,
    setShowSchedule,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    handleSend,
    handleSchedule,
  };
}
