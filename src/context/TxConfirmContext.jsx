import { createContext, useContext, useRef, useState, useCallback } from "react";
import { toast } from "./ToastContext.jsx";

const TxConfirmContext = createContext(null);

export function TxConfirmProvider({ children }) {
  const [visible, setVisible]   = useState(false);
  const [info, setInfo]         = useState({ label: "", amount: null, token: null });
  const resolveRef              = useRef(null);

  /**
   * confirmTx(labelOrObj)
   * - string  → { label: string }
   * - object  → { label, amount, token }
   */
  const confirmTx = useCallback((labelOrObj = "esta acción") => {
    if (typeof labelOrObj === "string") {
      setInfo({ label: labelOrObj, amount: null, token: null });
    } else {
      setInfo({
        label:  labelOrObj.label  || labelOrObj.action || "Confirmar operación",
        amount: labelOrObj.amount ?? null,
        token:  labelOrObj.token  ?? null,
      });
    }
    setVisible(true);
    return new Promise((resolve) => { resolveRef.current = resolve; });
  }, []);

  const handleConfirm = () => {
    setVisible(false);
    resolveRef.current?.(true);
    toast("Enviando a World App para firmar...", "info", 8000);
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
                <path d="M20 11v11M20 27v2" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <h3 className="txpop-title">Confirmar transacción</h3>
            <p className="txpop-action">{info.label}</p>

            {info.amount && (
              <div className="txpop-amount-box">
                <span className="txpop-amount-label">Monto</span>
                <span className="txpop-amount-value">
                  {info.amount}{info.token ? ` ${info.token}` : ""}
                </span>
              </div>
            )}

            <div className="txpop-gas-warning">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4a1 1 0 011 1v4a1 1 0 11-2 0V7a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <div>
                <div className="txpop-gas-title">⚠️ El usuario necesita ETH para esta TX</div>
                <div className="txpop-gas-desc">
                  Esta transacción requiere <strong>ETH en tu wallet de World App</strong> para pagar el gas en World Chain. Si no tienes suficiente ETH, la operación fallará.
                </div>
              </div>
            </div>

            <div className="txpop-btns">
              <button className="txpop-btn-cancel" onClick={handleCancel}>Cancelar</button>
              <button className="txpop-btn-confirm" onClick={handleConfirm}>Confirmar</button>
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
