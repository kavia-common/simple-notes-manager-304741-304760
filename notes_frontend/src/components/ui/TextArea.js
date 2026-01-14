import React from "react";
import "./ui.css";

/**
 * PUBLIC_INTERFACE
 * TextArea primitive.
 */
export function TextArea({ label, className = "", ...props }) {
  return (
    <label style={{ display: "block" }}>
      {label ? <span className="uiLabel">{label}</span> : null}
      <textarea className={`uiField ${className}`} {...props} />
    </label>
  );
}
