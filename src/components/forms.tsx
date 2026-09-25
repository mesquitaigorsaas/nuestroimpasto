"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={`btn h-11 ${className}`}>
      {pending ? (pendingText ?? "Aguarde…") : children}
    </button>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, id, name, ...rest }: FieldProps) {
  const fid = id ?? name;
  return (
    <div>
      <label htmlFor={fid} className="label">
        {label}
      </label>
      <input id={fid} name={name} className={`input ${error ? "border-tomato" : ""}`} aria-invalid={!!error} {...rest} />
      {error ? <p className="mt-1 text-xs text-tomato">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string };

export function TextArea({ label, error, hint, id, name, ...rest }: AreaProps) {
  const fid = id ?? name;
  return (
    <div>
      <label htmlFor={fid} className="label">
        {label}
      </label>
      <textarea id={fid} name={name} className={`input min-h-24 resize-y ${error ? "border-tomato" : ""}`} aria-invalid={!!error} {...rest} />
      {error ? <p className="mt-1 text-xs text-tomato">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="rounded-xl bg-tomato/10 px-3.5 py-2.5 text-sm text-tomato">{message}</div>;
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="rounded-xl bg-basil/10 px-3.5 py-2.5 text-sm text-basil">{message}</div>;
}
