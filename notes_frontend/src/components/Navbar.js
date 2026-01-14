import React from "react";
import { Button } from "./ui/Button";
import { isApiEnabled } from "../services/notesService";
import "./navbar.css";

/**
 * PUBLIC_INTERFACE
 * Top navigation bar for the Notes app.
 */
export function Navbar({ onToggleListMobile }) {
  const mode = isApiEnabled() ? "API" : "Local";

  return (
    <header className="navbar">
      <div className="navbarInner">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <div>
            <div className="brandTitle">Notes</div>
            <div className="brandSub">Ocean Professional</div>
          </div>
        </div>

        <div className="navbarRight">
          <span className={`modePill mode-${mode.toLowerCase()}`} title="Persistence mode">
            {mode}
          </span>
          <Button className="mobileOnly" variant="ghost" onClick={onToggleListMobile}>
            Notes list
          </Button>
        </div>
      </div>
    </header>
  );
}
