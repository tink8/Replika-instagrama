import { X } from "lucide-react";
import type { ReactNode } from "react";

interface OverlayPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function OverlayPanel({
  open,
  title,
  subtitle,
  onClose,
  children,
}: OverlayPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="overlay-shell"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="overlay-backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />

      <section className="overlay-panel">
        <header className="overlay-panel-header">
          <h2 className="overlay-panel-title">{title}</h2>

          <button
            type="button"
            className="overlay-panel-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </header>

        {subtitle ? (
          <div className="overlay-panel-subtitle">
            <p>{subtitle}</p>
          </div>
        ) : null}

        <div className="overlay-panel-body">{children}</div>
      </section>
    </div>
  );
}
