import { formatUnits } from "viem";
import { useContractRead } from "../hooks/useContract.js";
import { useReadContract } from "wagmi";
import "../styles/PositionCard.css";

// viem returns arrays for multi-output functions:
// pos[0]=token0, pos[1]=token1, pos[2]=fee, pos[3]=tickLower, pos[4]=tickUpper
// pos[5]=liquidity, pos[6]=tokensOwed0, pos[7]=tokensOwed1, pos[8]=managed, pos[9]=isInRange

const SHORT = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

const ERC20_META_ABI = [
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
];

function TokenSymbol({ address }) {
  const { data: symbol } = useReadContract({
    address,
    abi: ERC20_META_ABI,
    functionName: "symbol",
    query: { enabled: !!address, staleTime: 300000 },
  });
  return <>{symbol ?? SHORT(address)}</>;
}

function useTokenDecimals(address) {
  const { data } = useReadContract({
    address,
    abi: ERC20_META_ABI,
    functionName: "decimals",
    query: { enabled: !!address, staleTime: 300000 },
  });
  return Number(data ?? 18);
}

export default function PositionCard({ tokenId, onRemove, isOwner }) {
  const { data: pos, isLoading } = useContractRead("getPosition", [tokenId], true);

  // Read token decimals for correct fee formatting
  const dec0 = useTokenDecimals(pos?.[0]);
  const dec1 = useTokenDecimals(pos?.[1]);

  if (isLoading) {
    return (
      <div className="position-card loading">
        <div className="position-loading-text">Cargando #{tokenId.toString()}...</div>
      </div>
    );
  }

  if (!pos) return null;

  // Use array indices — named access returns undefined
  const token0 = pos[0];
  const token1 = pos[1];
  const fee = pos[2];
  const liquidity = pos[5];
  const tokensOwed0 = pos[6] ?? 0n;
  const tokensOwed1 = pos[7] ?? 0n;
  const isInRange = pos[9];

  const fees0 = parseFloat(formatUnits(tokensOwed0, dec0));
  const fees1 = parseFloat(formatUnits(tokensOwed1, dec1));
  const hasFees = fees0 > 0.000001 || fees1 > 0.000001;
  const hasLiquidity = liquidity !== undefined && liquidity > 0n;

  return (
    <div className={`position-card ${isInRange ? "in-range" : "out-range"}`}>
      <div className="position-header">
        <div className="position-id-group">
          <span className="position-id">NFT #{tokenId.toString()}</span>
          {hasFees && <span className="fees-dot" title="Fees sin reclamar">●</span>}
        </div>
        <span className={`range-badge ${isInRange ? "in" : "out"}`}>
          {isInRange ? "✅ En Rango" : "❌ Fuera de Rango"}
        </span>
      </div>

      <div className="position-pool">
        <div className="pool-tokens">
          <a className="token-pill" href={`https://worldscan.org/token/${token0}`} target="_blank" rel="noreferrer">
            <TokenSymbol address={token0} />
          </a>
          <span className="pool-sep">↔</span>
          <a className="token-pill" href={`https://worldscan.org/token/${token1}`} target="_blank" rel="noreferrer">
            <TokenSymbol address={token1} />
          </a>
        </div>
        {fee !== undefined && (
          <span className="fee-tier">{(Number(fee) / 10000).toFixed(2)}%</span>
        )}
      </div>

      <div className="position-details">
        <div className="detail-row">
          <span>Liquidez</span>
          <span className={hasLiquidity ? "text-success" : "text-warn"}>
            {hasLiquidity ? `${liquidity.toString().slice(0, 12)}…` : "⚠️ Sin liquidez"}
          </span>
        </div>
        <div className="detail-row fees-row">
          <span>Fees pendientes</span>
          <div className="fees-values">
            <span className={hasFees ? "fee-value has-fees" : "fee-value"}>
              {fees0.toFixed(6)}
            </span>
            <span className="fees-sep">/</span>
            <span className={hasFees ? "fee-value has-fees" : "fee-value"}>
              {fees1.toFixed(6)}
            </span>
          </div>
        </div>
      </div>

      <div className="position-actions">
        <a href={`https://app.uniswap.org/positions/${tokenId.toString()}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
          Uniswap ↗
        </a>
        <a href={`https://worldscan.org/token/0xec12a9F9a09f50550686363766Cc153D03c27b5e?a=${tokenId.toString()}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
          Explorer ↗
        </a>
        {isOwner && (
          <button className="btn-danger btn-sm" onClick={() => onRemove(tokenId)}>
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}
