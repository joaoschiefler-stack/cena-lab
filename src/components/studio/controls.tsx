"use client";

import type { ReactNode } from "react";

/** Título de grupo de campos com numeração estilo "faixa de timeline". */
export function FieldLegend({ step, children, hint }: { step?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
      <span className="flex items-baseline gap-2 text-sm font-medium text-fg">
        {step && <span className="font-mono text-[11px] text-brand">{step}</span>}
        {children}
      </span>
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </legend>
  );
}

interface Option<T extends string | number> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
}

/** Grupo de rádios segmentado (duração, ritmo, final). */
export function Segmented<T extends string | number>({
  name,
  value,
  options,
  onChange,
  columns = 4,
}: {
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[columns];
  return (
    <div className={`grid gap-2 ${cols}`}>
      {options.map((opt) => (
        <label key={String(opt.value)} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={String(opt.value)}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="peer sr-only"
          />
          <span className="flex h-full flex-col rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:shadow-[0_0_0_3px_rgb(49_88_220/0.12)] peer-checked:text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
            <span className="font-medium">{opt.label}</span>
            {opt.description && <span className="mt-0.5 text-xs text-subtle">{opt.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Switch acessível (role="switch"). */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-subtle">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
          checked ? "border-brand bg-brand" : "border-line-strong bg-raised"
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

/** Rádios em formato de chips (listas mais longas, quebra de linha automática). */
export function Chips<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label key={opt.value} className="cursor-pointer" title={opt.title}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="peer sr-only"
          />
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:shadow-[0_0_0_3px_rgb(49_88_220/0.12)] peer-checked:text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-line-strong"}`}>
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#3158dc]"
      />
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </span>
    </label>
  );
}

/** Campo de texto curto com contador e erro, no padrão visual do estúdio. */
export function TextField({
  id,
  label,
  value,
  onChange,
  max,
  placeholder,
  error,
  multiline = false,
  rows = 3,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const length = value.trim().length;
  const cls =
    "block w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          maxLength={max + 50}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-error`}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} resize-y`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          maxLength={max + 20}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-error`}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
      <div className="mt-1 flex justify-between gap-3">
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error ?? ""}
        </p>
        <span className={`font-mono text-[11px] ${length > max ? "text-danger" : "text-subtle"}`}>
          {length}/{max}
        </span>
      </div>
    </div>
  );
}
