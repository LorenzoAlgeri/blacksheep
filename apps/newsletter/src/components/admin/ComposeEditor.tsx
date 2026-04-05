"use client";

import { useState } from "react";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { useEventEditor } from "@/hooks/useEventEditor";
import { useEmailPreview } from "@/hooks/useEmailPreview";
import { useEmailSender } from "@/hooks/useEmailSender";
import { EditorTab } from "./compose/EditorTab";
import { TemplatesTab } from "./compose/TemplatesTab";
import { formatTime } from "./compose/shared";

const inputClass =
  "w-full bg-transparent border border-bs-cream/10 rounded px-3 py-2.5 font-body text-sm text-bs-cream placeholder:text-bs-cream/20 focus:border-bs-cream/30 focus:outline-none transition-colors";
const labelClass = "font-body text-[11px] text-bs-cream/40 mb-1 block tracking-wide uppercase";

export function ComposeEditor() {
  const composer = useEmailComposer();
  const events = useEventEditor(composer.state, composer.set);
  const preview = useEmailPreview(composer.state);
  const sender = useEmailSender();

  const [tab, setTab] = useState<"editor" | "preview" | "templates">("editor");
  const [uploading, setUploading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveAs, setShowSaveAs] = useState(false);

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        sender.setResult(`Errore: ${data.error}`);
      } else {
        composer.set("photoUrl", data.url);
        composer.set("showPhoto", true);
      }
    } catch {
      sender.setResult("Errore upload.");
    } finally {
      setUploading(false);
    }
  }

  function saveAsTemplate() {
    const name = templateName.trim();
    if (!name) return;
    composer.saveAsTemplate(name);
    setTemplateName("");
    setShowSaveAs(false);
    sender.flashResult(`Template "${name}" salvato.`);
  }

  function loadTemplate(t: (typeof composer.templates)[number]) {
    composer.loadTemplate(t);
    setTab("editor");
    sender.flashResult(`Template "${t.name}" caricato.`);
  }

  function onSendSuccess() {
    composer.clearAutoSave();
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Tab navigation + auto-save indicator */}
      <div className="flex items-end border-b border-bs-cream/10 mb-6">
        <div className="flex">
          {(["editor", "preview", "templates"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 font-[family-name:var(--font-brand)] text-xs tracking-[0.2em] transition-colors cursor-pointer ${
                tab === t
                  ? "text-bs-cream border-b-2 border-bs-cream -mb-px"
                  : "text-bs-cream/30 hover:text-bs-cream/50"
              }`}
            >
              {t === "templates"
                ? `BOZZE${composer.templates.length ? ` (${composer.templates.length})` : ""}`
                : t.toUpperCase()}
            </button>
          ))}
        </div>
        {composer.lastSaved && (
          <span className="ml-auto font-body text-[10px] text-bs-cream/20 pb-2.5 whitespace-nowrap">
            salvata {formatTime(composer.lastSaved)}
          </span>
        )}
      </div>

      {/* EDITOR TAB */}
      {tab === "editor" && (
        <EditorTab
          state={composer.state}
          set={composer.set}
          events={events}
          sender={sender}
          uploading={uploading}
          onFileUpload={handleFileUpload}
          showSaveAs={showSaveAs}
          setShowSaveAs={setShowSaveAs}
          templateName={templateName}
          setTemplateName={setTemplateName}
          onSaveAsTemplate={saveAsTemplate}
          onResetToDefaults={composer.resetToDefaults}
          onSend={() => sender.handleSend(composer.state.subject, preview.emailHtml, onSendSuccess)}
          onSchedule={() =>
            sender.handleSchedule(composer.state.subject, preview.emailHtml, onSendSuccess)
          }
          inputClass={inputClass}
          labelClass={labelClass}
        />
      )}

      {/* PREVIEW TAB */}
      {tab === "preview" && (
        <div className="rounded border border-bs-cream/10 overflow-hidden animate-fade-in">
          <div dangerouslySetInnerHTML={{ __html: preview.emailHtml }} />
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === "templates" && (
        <TemplatesTab
          templates={composer.templates}
          onLoad={loadTemplate}
          onDelete={composer.deleteTemplate}
        />
      )}

      {/* Result message (visible in all tabs) */}
      {sender.result && tab !== "editor" && (
        <p
          className={`font-body text-sm text-center mt-4 ${sender.result.startsWith("Errore") ? "text-bs-burgundy" : "text-bs-green"}`}
        >
          {sender.result}
        </p>
      )}
    </div>
  );
}
