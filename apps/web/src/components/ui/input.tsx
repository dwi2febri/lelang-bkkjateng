import { useId } from "react";
import type { InputHTMLAttributes } from "react";
export function Input({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generated = useId();
  const fieldId = id || generated;
  return (
    <label className="admin-field" htmlFor={fieldId}>
      <span>{label}</span>
      <input id={fieldId} {...props} />
    </label>
  );
}
