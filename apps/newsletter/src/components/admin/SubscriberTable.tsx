"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle, Clock, XCircle } from "lucide-react";

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

export function SubscriberTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/subscribers")
      .then((res) => res.json())
      .then((data) => {
        setSubscribers(data.subscribers ?? []);
        setLoading(false);
      });
  }, []);

  const confirmed = subscribers.filter((s) => s.status === "confirmed").length;
  const pending = subscribers.filter((s) => s.status === "pending").length;

  if (loading) {
    return <p className="font-body text-bs-cream/50 text-center py-12">Caricamento...</p>;
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <Users size={20} className="text-bs-cream mx-auto mb-1" />
          <p className="font-heading text-2xl text-bs-cream">{subscribers.length}</p>
          <p className="font-body text-xs text-bs-cream/40">Totali</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <CheckCircle size={20} className="text-bs-green mx-auto mb-1" />
          <p className="font-heading text-2xl text-bs-cream">{confirmed}</p>
          <p className="font-body text-xs text-bs-cream/40">Confermati</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <Clock size={20} className="text-bs-cream/60 mx-auto mb-1" />
          <p className="font-heading text-2xl text-bs-cream">{pending}</p>
          <p className="font-body text-xs text-bs-cream/40">In attesa</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="text-bs-cream/50 text-left border-b border-bs-cream/10">
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Nome</th>
              <th className="pb-2 pr-4">Stato</th>
              <th className="pb-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub) => (
              <tr key={sub.id} className="border-b border-bs-cream/5">
                <td className="py-2 pr-4 text-bs-cream">{sub.email}</td>
                <td className="py-2 pr-4 text-bs-cream/60">{sub.name ?? "\u2014"}</td>
                <td className="py-2 pr-4">
                  {sub.status === "confirmed" && (
                    <span className="text-bs-green flex items-center gap-1">
                      <CheckCircle size={14} /> Confermato
                    </span>
                  )}
                  {sub.status === "pending" && (
                    <span className="text-bs-cream/60 flex items-center gap-1">
                      <Clock size={14} /> In attesa
                    </span>
                  )}
                  {sub.status === "unsubscribed" && (
                    <span className="text-bs-cream/30 flex items-center gap-1">
                      <XCircle size={14} /> Disiscritto
                    </span>
                  )}
                </td>
                <td className="py-2 text-bs-cream/40">
                  {new Date(sub.created_at).toLocaleDateString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subscribers.length === 0 && (
        <p className="font-body text-bs-cream/30 text-center py-8">Nessun iscritto ancora.</p>
      )}
    </div>
  );
}
