import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
export function Input({
  label,
  id,
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: ReactNode }) {
  const generated = useId();
  const fieldId = id || generated;
  return (
    <label className="admin-field" htmlFor={fieldId}>
      <span className={icon ? "field-label-with-icon" : undefined}>{icon}{label}</span>
      <input id={fieldId} {...props} />
    </label>
  );
}
