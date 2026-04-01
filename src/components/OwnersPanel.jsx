import { useState } from "react";
import { useContractRead, useContractWrite, useIsPrimaryOwner } from "../hooks/useContract.js";
import "../styles/OwnersPanel.css";

const SHORT = (addr) => `${addr.slice(0,6)}...${addr.slice(-4)}`;

export default function OwnersPanel() {
  const { data: owners, refetch } = useContractRead("getOwners", [], true);
  const { data: primaryOwner } = useContractRead("primaryOwner");
  const isPrimary = useIsPrimaryOwner();
  const { write, isPending } = useContractWrite();

  const [newOwner, setNewOwner] = useState("");
  const [msg, setMsg] = useState("");

  const handleAdd = async () => {
    if (!newOwner) return;
    try {
      setMsg("Agregando owner...");
      await write("addOwner", [newOwner]);
      setMsg("✅ Owner agregado");
      setNewOwner("");
      refetch();
    } catch (e) {
      setMsg(`❌ Error: ${e.shortMessage || e.message}`);
    }
  };

  const handleRemove = async (addr) => {
    if (!confirm(`¿Eliminar owner ${addr}?`)) return;
    try {
      setMsg("Eliminando owner...");
      await write("removeOwner", [addr]);
      setMsg("✅ Owner eliminado");
      refetch();
    } catch (e) {
      setMsg(`❌ Error: ${e.shortMessage || e.message}`);
    }
  };

  return (
    <div className="owners-panel">
      <h3>Gestión de Owners</h3>
      {msg && <div className="owners-msg">{msg}</div>}

      <div className="owners-list">
        {owners?.map((addr) => (
          <div key={addr} className="owner-row">
            <div className="owner-info">
              <span className="owner-addr">
                <a href={`https://worldscan.org/address/${addr}`} target="_blank" rel="noreferrer">
                  {SHORT(addr)}
                </a>
              </span>
              {addr.toLowerCase() === primaryOwner?.toLowerCase() && (
                <span className="owner-badge-primary">Primary</span>
              )}
            </div>
            {isPrimary && addr.toLowerCase() !== primaryOwner?.toLowerCase() && (
              <button className="btn-danger btn-sm" onClick={() => handleRemove(addr)} disabled={isPending}>
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="add-owner-form">
        <h4>Agregar Owner</h4>
        <div className="form-row">
          <input
            type="text"
            placeholder="0x... dirección del nuevo owner"
            value={newOwner}
            onChange={e => setNewOwner(e.target.value)}
          />
          <button className="btn-primary" onClick={handleAdd} disabled={!newOwner || isPending}>
            {isPending ? "Enviando..." : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
