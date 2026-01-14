import React from "react";
import "./ui.css";

/**
 * PUBLIC_INTERFACE
 * Input primitive.
 */
export function Input({ label, className = "", ...props }) {
  return (
    <label style={{ display: "block" }}>
      {label ? <span className="uiLabel">{label}</span> : null}
      <input className={`uiField ${className}`} {...props} />
    </label>
  );
}
