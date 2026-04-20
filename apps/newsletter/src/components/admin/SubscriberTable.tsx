"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, Clock, Ban, Unlock, Trash2, ShieldX } from "lucide-react";
import { basePath } from "@/lib/base-path";

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string | null;
  subscribed_at: string | null;
  confirmed_at: string | null;
  follow_up_count: number | null;
  follow_up_last_sent_at: string | null;
};

type Tab = "confirmed" | "pending" | "blocked";
type FollowUpMode = "all" | "selected" | "oldest";

const FOLLOW_UP_INTERVAL_HOURS = 48;
const FOLLOW_UP_MAX_ATTEMPTS = 3;

function getSignupDate(subscriber: Subscriber): string | null {
  return subscriber.subscribed_at ?? subscriber.created_at;
}

function formatDate(value: string | null): string {
  if (!value) return "\u2014";
  return new Date(value).toLocaleDateString("it-IT");
}

function getPendingDays(subscriber: Subscriber): number {
  const signup = getSignupDate(subscriber);
  if (!signup) return 0;
  const diffMs = Date.now() - new Date(signup).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getFollowUpCount(subscriber: Subscriber): number {
  const count = subscriber.follow_up_count ?? 0;
  return Math.max(0, count);
}

function getNextDueAt(subscriber: Subscriber): string | null {
  const count = getFollowUpCount(subscriber);
  if (count >= FOLLOW_UP_MAX_ATTEMPTS) return null;

  const baseDate = subscriber.follow_up_last_sent_at ?? getSignupDate(subscriber);
  if (!baseDate) return null;

  const nextDue = new Date(baseDate);
  nextDue.setHours(nextDue.getHours() + FOLLOW_UP_INTERVAL_HOURS);
  return nextDue.toISOString();
}

function isEligibleForFollowUp(subscriber: Subscriber): boolean {
  if (subscriber.status !== "pending") return false;
  const count = getFollowUpCount(subscriber);
  if (count >= FOLLOW_UP_MAX_ATTEMPTS) return false;

  const nextDue = getNextDueAt(subscriber);
  if (!nextDue) return true;

  return new Date(nextDue).getTime() <= Date.now();
}

function getFollowUpStatus(subscriber: Subscriber) {
  const count = getFollowUpCount(subscriber);
  if (count >= FOLLOW_UP_MAX_ATTEMPTS) {
    return { symbol: "\u26d4", label: "Limite raggiunto", color: "text-bs-burgundy" };
  }
  if (isEligibleForFollowUp(subscriber)) {
    return { symbol: "\u26a1", label: "Invio disponibile", color: "text-bs-green" };
  }
  return { symbol: "\ud83d\udd52", label: "In attesa finestra", color: "text-bs-cream/60" };
}

export function SubscriberTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("confirmed");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<Tab, number>>({
    confirmed: 0,
    pending: 0,
    blocked: 0,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const pageSize = 100;

  const fetchSubscribers = useCallback(() => {
    setLoading(true);
    setError(null);
    const offset = (currentPage - 1) * pageSize;

    fetch(
      `${basePath}/api/admin/subscribers?status=${activeTab}&limit=${pageSize}&offset=${offset}`,
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch subscribers");
        }

        return response.json();
      })
      .then((data) => {
        const currentSubscribers: Subscriber[] = data.subscribers ?? [];
        setSubscribers(currentSubscribers);
        setTotalSubscribers(typeof data.total === "number" ? data.total : 0);
        setFilteredTotal(typeof data.filteredTotal === "number" ? data.filteredTotal : 0);
        setStatusCounts({
          confirmed: Number(data.statusCounts?.confirmed ?? 0),
          pending: Number(data.statusCounts?.pending ?? 0),
          blocked: Number(data.statusCounts?.blocked ?? 0),
        });

        const pendingIds = currentSubscribers
          .filter((subscriber) => subscriber.status === "pending")
          .map((subscriber) => subscriber.id);
        setSelectedPendingIds(pendingIds);
        setLoading(false);
      })
      .catch(() => {
        setError("Errore nel caricamento degli iscritti.");
        setLoading(false);
      });
  }, [activeTab, currentPage]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleAction = async (id: string, action: "block" | "unblock") => {
    setActionLoading(id);
    try {
      const res = await fetch(`${basePath}/api/admin/subscribers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) fetchSubscribers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${basePath}/api/admin/subscribers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirmDelete(null);
        fetchSubscribers();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const pendingSubscribers = subscribers.filter((subscriber) => subscriber.status === "pending");

  const sendFollowUp = async (mode: FollowUpMode) => {
    setFollowUpLoading(true);
    setFollowUpMessage(null);

    const body: { mode: FollowUpMode; subscriberIds?: string[]; oldestCount?: number } = { mode };

    if (mode === "selected") {
      body.subscriberIds = selectedPendingIds;
    }

    if (mode === "oldest") {
      body.oldestCount = 1;
    }

    try {
      const response = await fetch(`${basePath}/api/admin/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) {
        setFollowUpMessage(payload.error ?? "Errore invio follow-up.");
        return;
      }

      setFollowUpMessage(
        `Follow-up inviati: ${payload.sent}. Saltati: ${payload.skipped}. Errori: ${payload.errors}.`,
      );
      fetchSubscribers();
    } catch {
      setFollowUpMessage("Errore di rete durante l'invio follow-up.");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const togglePendingSelection = (id: string) => {
    setSelectedPendingIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const selectAllPending = () => {
    setSelectedPendingIds(pendingSubscribers.map((subscriber) => subscriber.id));
  };

  const clearPendingSelection = () => {
    setSelectedPendingIds([]);
  };

  const confirmed = statusCounts.confirmed;
  const pending = statusCounts.pending;
  const blocked = statusCounts.blocked;
  const eligiblePending = pendingSubscribers.filter(isEligibleForFollowUp).length;
  const exhaustedPending = pendingSubscribers.filter(
    (subscriber) => getFollowUpCount(subscriber) >= FOLLOW_UP_MAX_ATTEMPTS,
  ).length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));

  const tabs: { key: Tab; label: string }[] = [
    { key: "confirmed", label: "Confermati" },
    { key: "pending", label: "In attesa" },
    { key: "blocked", label: "Bloccati" },
  ];

  if (loading) {
    return <p className="font-body text-bs-cream/50 text-center py-12">Caricamento...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-bs-burgundy mb-4">{error}</p>
        <button
          onClick={fetchSubscribers}
          className="font-body text-sm text-bs-cream/60 underline hover:text-bs-cream cursor-pointer"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <Users size={20} className="text-bs-cream mx-auto mb-1" />
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">
            {totalSubscribers}
          </p>
          <p className="font-body text-xs text-bs-cream/40">Totali</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <CheckCircle size={20} className="text-bs-green mx-auto mb-1" />
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">{confirmed}</p>
          <p className="font-body text-xs text-bs-cream/40">Confermati</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <Clock size={20} className="text-bs-cream/60 mx-auto mb-1" />
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">{pending}</p>
          <p className="font-body text-xs text-bs-cream/40">In attesa</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <p className="text-bs-green mx-auto mb-1 text-lg">{"\u26a1"}</p>
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">
            {eligiblePending}
          </p>
          <p className="font-body text-xs text-bs-cream/40">Follow-up pronti</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <ShieldX size={20} className="text-bs-burgundy mx-auto mb-1" />
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">{blocked}</p>
          <p className="font-body text-xs text-bs-cream/40">Bloccati</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-bs-cream/10 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-body text-xs px-4 py-2 -mb-px transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "border-b-2 border-bs-cream text-bs-cream"
                : "text-bs-cream/40 hover:text-bs-cream/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "pending" && (
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendFollowUp("all")}
              disabled={followUpLoading}
              className="font-body text-xs px-3 py-2 rounded border border-bs-cream/20 text-bs-cream hover:bg-bs-cream/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Invia follow-up a tutti
            </button>
            <button
              onClick={() => sendFollowUp("selected")}
              disabled={followUpLoading || selectedPendingIds.length === 0}
              className="font-body text-xs px-3 py-2 rounded border border-bs-cream/20 text-bs-cream hover:bg-bs-cream/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Invia ai selezionati ({selectedPendingIds.length})
            </button>
            <button
              onClick={() => sendFollowUp("oldest")}
              disabled={followUpLoading}
              className="font-body text-xs px-3 py-2 rounded border border-bs-cream/20 text-bs-cream hover:bg-bs-cream/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Invia al piu vecchio
            </button>
            <button
              onClick={selectAllPending}
              disabled={followUpLoading}
              className="font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors disabled:opacity-50 cursor-pointer"
            >
              Seleziona tutti
            </button>
            <button
              onClick={clearPendingSelection}
              disabled={followUpLoading}
              className="font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors disabled:opacity-50 cursor-pointer"
            >
              Deseleziona
            </button>
          </div>

          <div className="bg-bs-cream/5 rounded-lg p-3 border border-bs-cream/10">
            <p className="font-body text-xs text-bs-cream/70 mb-2">
              Legenda: {"\u23f3"} giorni in attesa, {"\u21bb"} tentativi follow-up, {"\u26a1"}{" "}
              pronto ora, {"\u23f2"} in raffreddamento 48h, {"\u26d4"} limite massimo raggiunto (
              {FOLLOW_UP_MAX_ATTEMPTS}/{FOLLOW_UP_MAX_ATTEMPTS}).
            </p>
            <p className="font-body text-xs text-bs-cream/45">
              Follow-up automatico: max {FOLLOW_UP_MAX_ATTEMPTS} invii ogni{" "}
              {FOLLOW_UP_INTERVAL_HOURS}
              ore, da BLACK SHEEP &lt;the.blacksheep.night@gmail.com&gt;.
            </p>
            <p className="font-body text-xs text-bs-cream/45 mt-1">
              Pending con limite esaurito in pagina: {exhaustedPending}
            </p>
          </div>

          {followUpMessage && (
            <p className="font-body text-xs text-bs-cream/70">{followUpMessage}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:hidden">
        {subscribers.map((subscriber) => {
          const status = getFollowUpStatus(subscriber);
          const pendingDays = getPendingDays(subscriber);
          const followUpCount = getFollowUpCount(subscriber);

          return (
            <div key={subscriber.id} className="bg-bs-cream/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-sm text-bs-cream truncate pr-2">{subscriber.email}</p>
                <StatusBadge status={subscriber.status} />
              </div>

              {activeTab === "pending" && (
                <label className="flex items-center gap-2 font-body text-xs text-bs-cream/70">
                  <input
                    type="checkbox"
                    checked={selectedPendingIds.includes(subscriber.id)}
                    onChange={() => togglePendingSelection(subscriber.id)}
                    className="accent-bs-cream"
                  />
                  Seleziona per follow-up
                </label>
              )}

              <div className="flex items-center justify-between font-body text-xs text-bs-cream/40">
                <span>{subscriber.name ?? "\u2014"}</span>
                <span>{formatDate(getSignupDate(subscriber))}</span>
              </div>

              {subscriber.status === "pending" && (
                <p className={`font-body text-xs ${status.color}`}>
                  {status.symbol} {status.label} | {"\u23f3"} {pendingDays}g | {"\u21bb"}{" "}
                  {followUpCount}/{FOLLOW_UP_MAX_ATTEMPTS}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <ActionButtons
                  subscriber={subscriber}
                  activeTab={activeTab}
                  actionLoading={actionLoading}
                  confirmDelete={confirmDelete}
                  onAction={handleAction}
                  onConfirmDelete={setConfirmDelete}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block">
        <table className="w-full font-body text-xs">
          <thead>
            <tr className="text-bs-cream/50 text-left border-b border-bs-cream/10">
              {activeTab === "pending" && <th className="pb-2 pr-3">Sel</th>}
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Nome</th>
              <th className="pb-2 pr-4">Stato</th>
              <th className="pb-2 pr-4">Data</th>
              <th className="pb-2 pr-4">Follow-up</th>
              <th className="pb-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => {
              const status = getFollowUpStatus(subscriber);
              const pendingDays = getPendingDays(subscriber);
              const followUpCount = getFollowUpCount(subscriber);
              const nextDueAt = getNextDueAt(subscriber);

              return (
                <tr key={subscriber.id} className="border-b border-bs-cream/5">
                  {activeTab === "pending" && (
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedPendingIds.includes(subscriber.id)}
                        onChange={() => togglePendingSelection(subscriber.id)}
                        className="accent-bs-cream"
                      />
                    </td>
                  )}
                  <td className="py-2 pr-4 text-bs-cream">{subscriber.email}</td>
                  <td className="py-2 pr-4 text-bs-cream/60">{subscriber.name ?? "\u2014"}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={subscriber.status} />
                  </td>
                  <td className="py-2 pr-4 text-bs-cream/40 whitespace-nowrap">
                    {formatDate(getSignupDate(subscriber))}
                  </td>
                  <td className="py-2 pr-4 text-bs-cream/50">
                    {subscriber.status === "pending" ? (
                      <div className="space-y-0.5">
                        <p className={`whitespace-nowrap ${status.color}`}>
                          {status.symbol} {"\u23f3"} {pendingDays}g | {"\u21bb"} {followUpCount}/
                          {FOLLOW_UP_MAX_ATTEMPTS}
                        </p>
                        <p className="text-[11px] text-bs-cream/35 whitespace-nowrap">
                          Ultimo: {formatDate(subscriber.follow_up_last_sent_at)} | Prossimo:{" "}
                          {formatDate(nextDueAt)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-bs-cream/20">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButtons
                        subscriber={subscriber}
                        activeTab={activeTab}
                        actionLoading={actionLoading}
                        confirmDelete={confirmDelete}
                        onAction={handleAction}
                        onConfirmDelete={setConfirmDelete}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredTotal > pageSize && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-xs text-bs-cream/40">
            Pagina {currentPage} di {totalPages} · {filteredTotal} iscritti in questa sezione
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors disabled:opacity-40 cursor-pointer"
            >
              Precedente
            </button>
            <button
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="font-body text-xs px-3 py-2 rounded border border-bs-cream/10 text-bs-cream/70 hover:text-bs-cream transition-colors disabled:opacity-40 cursor-pointer"
            >
              Successiva
            </button>
          </div>
        </div>
      )}

      {subscribers.length === 0 && (
        <p className="font-body text-bs-cream/30 text-center py-8">
          Nessun iscritto in questa sezione.
        </p>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#0a0a0a] border border-bs-cream/10 rounded-lg p-6 max-w-sm mx-4">
            <p className="font-body text-sm text-bs-cream mb-4">
              Eliminare definitivamente questo iscritto? L&apos;azione non puo essere annullata.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="font-body text-xs text-bs-cream/50 px-4 py-2 rounded hover:text-bs-cream transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading === confirmDelete}
                className="font-body text-xs text-bs-cream bg-bs-burgundy/40 px-4 py-2 rounded hover:bg-bs-burgundy/60 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === confirmDelete ? "Eliminazione..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span className="text-bs-green flex items-center gap-1 text-xs flex-shrink-0">
        <CheckCircle size={12} /> Confermato
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="text-bs-cream/60 flex items-center gap-1 text-xs flex-shrink-0">
        <Clock size={12} /> In attesa
      </span>
    );
  }
  if (status === "blocked") {
    return (
      <span className="text-bs-burgundy flex items-center gap-1 text-xs flex-shrink-0">
        <ShieldX size={12} /> Bloccato
      </span>
    );
  }
  return null;
}

function ActionButtons({
  subscriber,
  activeTab,
  actionLoading,
  confirmDelete,
  onAction,
  onConfirmDelete,
}: {
  subscriber: Subscriber;
  activeTab: Tab;
  actionLoading: string | null;
  confirmDelete: string | null;
  onAction: (id: string, action: "block" | "unblock") => void;
  onConfirmDelete: (id: string | null) => void;
}) {
  const isLoading = actionLoading === subscriber.id;
  const isConfirming = confirmDelete === subscriber.id;

  return (
    <>
      {activeTab === "blocked" ? (
        <button
          onClick={() => onAction(subscriber.id, "unblock")}
          disabled={isLoading}
          title="Sblocca"
          className="p-1.5 rounded text-bs-cream/40 hover:text-bs-green hover:bg-bs-green/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Unlock size={14} />
        </button>
      ) : (
        <button
          onClick={() => onAction(subscriber.id, "block")}
          disabled={isLoading}
          title="Blocca"
          className="p-1.5 rounded text-bs-cream/40 hover:text-bs-burgundy hover:bg-bs-burgundy/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Ban size={14} />
        </button>
      )}
      <button
        onClick={() => onConfirmDelete(isConfirming ? null : subscriber.id)}
        disabled={isLoading}
        title="Elimina"
        className="p-1.5 rounded text-bs-cream/40 hover:text-bs-burgundy hover:bg-bs-burgundy/10 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Trash2 size={14} />
      </button>
    </>
  );
}
