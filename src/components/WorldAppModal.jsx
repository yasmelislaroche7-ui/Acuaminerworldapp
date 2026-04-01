import { useState, useEffect } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import "../styles/WorldAppModal.css";

export default function WorldAppModal({ onClose }) {
  const [isInWorldApp] = useState(() => {
    try { return MiniKit.isInstalled(); } catch { return false; }
  });
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenWorldApp = () => {
    const deepLink = `https://worldapp.io/mini-app?app_id=app_d3ea733327ecd8ed8368a0c408815c13`;
    window.open(deepLink, "_blank");
  };

  return (
    <div className="wam-overlay" onClick={onClose}>
      <div className="wam-modal" onClick={e => e.stopPropagation()}>
        <button className="wam-close" onClick={onClose}>✕</button>

        <div className="wam-logo">
          <svg viewBox="0 0 100 100" width="56" height="56">
            <circle cx="50" cy="50" r="48" fill="#000" stroke="#fff" strokeWidth="4"/>
            <circle cx="50" cy="50" r="28" fill="none" stroke="#fff" strokeWidth="5"/>
            <circle cx="50" cy="50" r="10" fill="#fff"/>
            <path d="M50 2 Q70 30 50 50 Q30 30 50 2Z" fill="#fff" opacity="0.35"/>
            <path d="M50 98 Q30 70 50 50 Q70 70 50 98Z" fill="#fff" opacity="0.35"/>
          </svg>
        </div>

        <h2 className="wam-title">Conectar con World App</h2>
        <p className="wam-subtitle">
          Accede desde la World App wallet para usar tu identidad World ID y disfrutar de funciones exclusivas.
        </p>

        {isInWorldApp ? (
          <div className="wam-already-in">
            <div className="wam-check">✓</div>
            <p>Ya estás dentro de World App</p>
            <p className="wam-hint">Tu wallet está conectada automáticamente.</p>
            <button className="wam-btn-primary" onClick={onClose}>Continuar</button>
          </div>
        ) : (
          <>
            <div className="wam-steps">
              <div className="wam-step">
                <span className="wam-step-num">1</span>
                <div className="wam-step-text">
                  <strong>Descarga World App</strong>
                  <span>Disponible en iOS y Android</span>
                </div>
              </div>
              <div className="wam-step">
                <span className="wam-step-num">2</span>
                <div className="wam-step-text">
                  <strong>Busca Acua Company</strong>
                  <span>En la sección de Mini Apps de World App</span>
                </div>
              </div>
              <div className="wam-step">
                <span className="wam-step-num">3</span>
                <div className="wam-step-text">
                  <strong>Abre la app directamente</strong>
                  <span>Tu wallet se conecta automáticamente</span>
                </div>
              </div>
            </div>

            <div className="wam-actions">
              <button className="wam-btn-primary" onClick={handleOpenWorldApp}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                Abrir en World App
              </button>

              <button className="wam-btn-secondary" onClick={handleCopyLink}>
                {copied ? "✓ Copiado" : "Copiar enlace"}
              </button>
            </div>

            <div className="wam-app-id">
              <span>App ID:</span>
              <code>app_d3ea733327ecd8ed8368a0c408815c13</code>
            </div>

            <div className="wam-divider">
              <span>o también puedes</span>
            </div>

            <div className="wam-stores">
              <a href="https://apps.apple.com/app/world-app/id1560859847" target="_blank" rel="noreferrer" className="wam-store-btn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.worldcoin" target="_blank" rel="noreferrer" className="wam-store-btn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l15 8.5c.6.34.6 1.26 0 1.6l-15 8.5c-.66.5-1.6.03-1.6-.8z"/></svg>
                Google Play
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
