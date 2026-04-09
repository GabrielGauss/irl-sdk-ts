/** Data models matching the IRL Engine wire format. */

export type TradeAction = "Long" | "Short" | "Neutral";

export type OrderType =
  | "MARKET"
  | "LIMIT"
  | "STOP"
  | "STOP_LIMIT"
  | "TWAP"
  | "VWAP"
  | "IOC"
  | "FOK";

export interface AuthorizeRequest {
  /** UUID string — must be registered in the Multi-Agent Registry. */
  agent_id: string;
  /** SHA-256 of the agent's model configuration (hex, 64 chars). */
  model_hash_hex: string;
  /** Human-readable model identifier. */
  model_id: string;

  prompt_version?: string;
  feature_schema_id?: string;
  hyperparameter_checksum?: string;

  action: TradeAction;
  asset: string;
  order_type?: OrderType;
  venue_id: string;
  quantity: number;
  notional: number;
  notional_currency?: string;
  multiplier?: number;
  limit_price?: number;
  stop_price?: number;
  client_order_id?: string;
  reduce_only?: boolean;

  /**
   * Unix milliseconds of the agent's decision time.
   * If omitted, IRLClient sets it to Date.now() before submission.
   */
  agent_valid_time?: number;
}

export interface AuthorizeResult {
  trace_id: string;
  reasoning_hash: string;
  authorized: boolean;
  shadow_blocked: boolean;
}

export interface Heartbeat {
  sequence_id: number;
  timestamp_ms: number;
  regime_id: number;
  mta_ref: string;
  signature: string;
}

export interface IRLClientOptions {
  /** Base URL of the IRL Engine (e.g. "https://irl.macropulse.live"). */
  irlUrl: string;
  /** Bearer token issued via IRL Engine admin. */
  apiToken: string;
  /**
   * Base URL of the MacroPulse MTA for heartbeat fetch.
   * Defaults to "https://api.macropulse.live".
   */
  mtaUrl?: string;
  /** Fetch timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number;
}
