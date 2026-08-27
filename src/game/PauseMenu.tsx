import type { CSSProperties } from "react";

interface PauseMenuProps {
  accentColor: string;
  onResume: () => void;
  onRestart: () => void;
  onChangeTrack: () => void;
  onCancel: () => void;
}

export default function PauseMenu({ accentColor, onResume, onRestart, onChangeTrack, onCancel }: PauseMenuProps) {
  const button = (label: string, onClick: () => void, primary = false) => (
    <button
      type="button"
      onClick={onClick}
      autoFocus={primary}
      className={`pause-menu-button${primary ? " pause-menu-button-primary" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="game-overlay pause-overlay"
      style={{ "--accent": accentColor } as CSSProperties}
    >
      <div className="pause-panel">
        <div id="pause-title" className="pause-title">⏸ PAUZĖ</div>
        {button("▶  PRATĘSTI LENKTYNES", onResume, true)}
        {button("↺  GRĮŽTI Į PRADŽIĄ", onRestart)}
        {button("⇄  PAKEISTI TRASĄ", onChangeTrack)}
        {button("✕  ATŠAUKTI LENKTYNES", onCancel)}
        <div className="pause-hint">ESC — tęsti</div>
      </div>
    </div>
  );
}
