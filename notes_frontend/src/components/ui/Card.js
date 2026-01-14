import React from "react";
import "./ui.css";

/**
 * PUBLIC_INTERFACE
 * Card primitive.
 */
export function Card({ className = "", children }) {
  return <div className={`uiCard ${className}`}>{children}</div>;
}

/**
 * PUBLIC_INTERFACE
 * CardBody primitive.
 */
export function CardBody({ className = "", children }) {
  return <div className={`uiCardBody ${className}`}>{children}</div>;
}
