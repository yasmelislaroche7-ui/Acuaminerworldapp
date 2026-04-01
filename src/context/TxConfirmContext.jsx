import { createContext, useContext, useRef, useState, useCallback } from "react";
import { toast } from "./ToastContext.jsx";

const TxConfirmContext = createContext(null);

export function TxConfirmProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("");
  const resolveRef = useRef(null);

  const confirmTx = useCallback((actionLabel = "esta acción") => {
    setLabel(actionLabel);
    setVisible(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setVisible(false);
    resolveRef.current?.(true);
    toast("Abriendo World App para firmar...", "info", 6000);
  };

  const handleCancel = () => {
    setVisible(false);
    resolveRef.current?.(false);
    toast("Transacción cancelada.", "warning", 3000);
  };

  return (
    <TxConfirmContext.Provider value={{ confirmTx }}>
      {children}
      {visible && (
        <div className="txpop-overlay" onClick={handleCancel}>
          <div className="txpop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="txpop-icon">
              <svg viewBox="0 0 40 40" width="40" height="40">
                <circle cx="20" cy="20" r="19" fill="#fff" />
                <path
                  d="M20 11v11M20 27v2"
                  stroke="#000"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h3 className="txpop-title">Confirmar transacción</h3>
            <p className="txpop-action">{label}</p>

            <div className="txpop-gas-warning">
              <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4a1 1 0 011 1v4a1 1 0 11-2 0V7a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <span>
                Necesitas <strong>ETH en tu wallet</strong> para pagar el gas. World App abrirá una ventana de confirmación.
              </span>
            </div>

            <div className="txpop-btns">
              <button className="txpop-btn-cancel" onClick={handleCancel}>
                Cancelar
              </button>
              <button className="txpop-btn-confirm" onClick={handleConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </TxConfirmContext.Provider>
  );
}

export function useTxConfirm() {
  const ctx = useContext(TxConfirmContext);
  if (!ctx) return { confirmTx: async () => true };
  return ctx;
}
