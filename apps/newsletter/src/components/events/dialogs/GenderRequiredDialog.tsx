"use client";

import { useId, useState } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";
import type { Gender } from "@/lib/validations";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "female", label: "Donna" },
  { value: "male", label: "Uomo" },
];

interface GenderRequiredDialogProps {
  open: boolean;
  onSubmit: (gender: Gender) => void;
  onCancel: () => void;
}

export function GenderRequiredDialog({ open, onSubmit, onCancel }: GenderRequiredDialogProps) {
  const titleId = useId();
  const descId = useId();
  const errorId = useId();
  const [selected, setSelected] = useState<Gender | null>(null);
  const [touched, setTouched] = useState(false);

  function handleSubmit() {
    setTouched(true);
    if (!selected) return;
    onSubmit(selected);
  }

  const showError = touched && !selected;

  return (
    <Dialog open={open} onClose={onCancel} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>UN&apos;ULTIMA COSA</DialogHeader>
      <DialogContent id={descId}>
        <p className="mb-4 text-sm">
          Per completare l&apos;iscrizione alla lista, indica come ti identifichi.
        </p>
        <fieldset aria-describedby={showError ? errorId : undefined}>
          <legend className="font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2">
            Genere <span aria-hidden="true">*</span>
          </legend>
          <div className="flex flex-col gap-1.5">
            {genderOptions.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="dialog-gender"
                  value={value}
                  checked={selected === value}
                  onChange={() => {
                    setSelected(value);
                    setTouched(false);
                  }}
                  className="accent-bs-cream w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-body text-sm text-bs-cream/70 group-hover:text-bs-cream transition-colors">
                  {label}
                </span>
              </label>
            ))}
          </div>
          {showError && (
            <p id={errorId} role="alert" className="font-body text-xs text-bs-burgundy mt-2">
              Seleziona un&apos;opzione per continuare
            </p>
          )}
        </fieldset>
      </DialogContent>
      <DialogFooter>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] px-5 py-3 border border-bs-cream/20 text-bs-cream/60 font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:border-bs-cream/40 hover:text-bs-cream/80 transition-all"
        >
          ANNULLA
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity"
        >
          CONTINUA
        </button>
      </DialogFooter>
    </Dialog>
  );
}
