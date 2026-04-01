import { useState } from "react";
import { useContractWrite } from "../hooks/useContract.js";
import "../styles/Modal.css";

export default function ImportModal({ onClose, onSuccess }) {
  const [tokenId, setTokenId] = useState("");
  const [tab, setTab] = useState("nft");
  const { write, isPending, isConfirming, error } = useContractWrite();

  const handleImport = async () => {
    if (!tokenId) return;
    try {
      await write("addPosition", [BigInt(tokenId)]);
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Importar Posición</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tabs">
          <button className={tab === "nft" ? "tab active" : "tab"} onClick={() => setTab("nft")}>
            NFT / LP
          </button>
          <button className={tab === "info" ? "tab active" : "tab"} onClick={() => setTab("info")}>
            ¿Cómo funciona?
          </button>
        </div>

        {tab === "nft" && (
          <div className="modal-body">
            <p className="hint">
              Ingresa el ID del NFT de Uniswap V3 que quieres que el bot gestione.
              El NFT debe existir y el contrato debe tener los permisos necesarios.
            </p>
            <label>Token ID del NFT</label>
            <input
              type="number"
              placeholder="ej: 12345"
              value={tokenId}
              onChange={e => setTokenId(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={!tokenId || isPending || isConfirming}
              >
                {isPending ? "Confirmando..." : isConfirming ? "Procesando..." : "Importar Posición"}
              </button>
            </div>
            {error && <p className="error-msg">{error.shortMessage || error.message}</p>}
          </div>
        )}

        {tab === "info" && (
          <div className="modal-body">
            <h4>Cómo importar tu posición</h4>
            <ol>
              <li>Ve a <a href="https://app.uniswap.org/positions" target="_blank" rel="noreferrer">Uniswap V3 Pools</a></li>
              <li>Encuentra tu posición de liquidez en World Chain</li>
              <li>Copia el ID del NFT de la URL o del título</li>
              <li>Pega el ID aquí y haz clic en "Importar"</li>
              <li>El bot comenzará a gestionar esa posición en el próximo ciclo</li>
            </ol>
            <p className="hint">
              <strong>Nota:</strong> Solo el owner puede importar posiciones.
              La posición debe ser un NFT de Uniswap V3 con WLD como token.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
