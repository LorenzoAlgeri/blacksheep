"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, Clock, Ban, Unlock, Trash2, ShieldX } from "lucide-react";
import { basePath } from "@/lib/base-path";

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

type Tab = "confirmed" | "pending" | "blocked";

export function SubscriberTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("confirmed");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchSubscribers = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${basePath}/api/admin/subscribers`)
      .then((res) => res.json())
      .then((data) => {
        setSubscribers(data.subscribers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Errore nel caricamento degli iscritti.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

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

  const confirmed = subscribers.filter((s) => s.status === "confirmed").length;
  const pending = subscribers.filter((s) => s.status === "pending").length;
  const blocked = subscribers.filter((s) => s.status === "blocked").length;
  const filtered = subscribers.filter((s) => s.status === activeTab);

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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <Users size={20} className="text-bs-cream mx-auto mb-1" />
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">
            {subscribers.length}
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
          <ShieldX size={20} className="text-bs-burgundy mx-auto mb-1" />
          <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">{blocked}</p>
          <p className="font-body text-xs text-bs-cream/40">Bloccati</p>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Mobile cards (visible below sm) */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.map((sub) => (
          <div key={sub.id} className="bg-bs-cream/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-body text-sm text-bs-cream truncate pr-2">{sub.email}</p>
              <StatusBadge status={sub.status} />
            </div>
            <div className="flex items-center justify-between font-body text-xs text-bs-cream/40">
              <span>{sub.name ?? "\u2014"}</span>
              <span>{new Date(sub.created_at).toLocaleDateString("it-IT")}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <ActionButtons
                subscriber={sub}
                activeTab={activeTab}
                actionLoading={actionLoading}
                confirmDelete={confirmDelete}
                onAction={handleAction}
                onConfirmDelete={setConfirmDelete}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table (visible at sm and above) */}
      <div className="hidden sm:block">
        <table className="w-full font-body text-xs">
          <thead>
            <tr className="text-bs-cream/50 text-left border-b border-bs-cream/10">
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Nome</th>
              <th className="pb-2 pr-4">Stato</th>
              <th className="pb-2 pr-4">Data</th>
              <th className="pb-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr key={sub.id} className="border-b border-bs-cream/5">
                <td className="py-2 pr-4 text-bs-cream">{sub.email}</td>
                <td className="py-2 pr-4 text-bs-cream/60">{sub.name ?? "\u2014"}</td>
                <td className="py-2 pr-4">
                  <StatusBadge status={sub.status} />
                </td>
                <td className="py-2 pr-4 text-bs-cream/40 whitespace-nowrap">
                  {new Date(sub.created_at).toLocaleDateString("it-IT")}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ActionButtons
                      subscriber={sub}
                      activeTab={activeTab}
                      actionLoading={actionLoading}
                      confirmDelete={confirmDelete}
                      onAction={handleAction}
                      onConfirmDelete={setConfirmDelete}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="font-body text-bs-cream/30 text-center py-8">
          Nessun iscritto in questa sezione.
        </p>
      )}

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#0a0a0a] border border-bs-cream/10 rounded-lg p-6 max-w-sm mx-4">
            <p className="font-body text-sm text-bs-cream mb-4">
              Eliminare definitivamente questo iscritto? L&apos;azione non pu&ograve; essere
              annullata.
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
