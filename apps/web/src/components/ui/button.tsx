import type { ButtonHTMLAttributes } from "react";
import { classes } from "@/lib/utils";
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      type="button"
      className={classes("admin-button", `admin-button-${variant}`, className)}
      {...props}
    />
  );
}
