import React from "react";
import "./ui.css";

/**
 * PUBLIC_INTERFACE
 * Button primitive with Ocean Professional variants.
 */
export function Button({ variant = "primary", className = "", ...props }) {
  const variantClass =
    variant === "secondary"
      ? "uiButtonSecondary"
      : variant === "ghost"
      ? "uiButtonGhost"
      : variant === "danger"
      ? "uiButtonDanger"
      : "";

  return <button className={`uiButton ${variantClass} ${className}`} {...props} />;
}
