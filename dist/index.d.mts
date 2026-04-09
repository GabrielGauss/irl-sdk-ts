/** Data models matching the IRL Engine wire format. */
type TradeAction = "Long" | "Short" | "Neutral";
type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" | "TWAP" | "VWAP" | "IOC" | "FOK";
interface AuthorizeRequest {
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
interface AuthorizeResult {
    trace_id: string;
    reasoning_hash: string;
    authorized: boolean;
    shadow_blocked: boolean;
}
interface Heartbeat {
    sequence_id: number;
    timestamp_ms: number;
    regime_id: number;
    mta_ref: string;
    signature: string;
}
interface IRLClientOptions {
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

/**
 * IRLClient — send authorized trade intents to the IRL Engine.
 *
 * @example
 * ```ts
 * import { IRLClient } from "irl-sdk";
 *
 * const client = new IRLClient({
 *   irlUrl: "https://irl.macropulse.live",
 *   apiToken: process.env.IRL_API_TOKEN!,
 * });
 *
 * const result = await client.authorize({
 *   agent_id: "550e8400-e29b-41d4-a716-446655440000",
 *   model_id: "my-algo-v1",
 *   model_hash_hex: "abc123...".padEnd(64, "0"),
 *   action: "Long",
 *   asset: "BTC-USD",
 *   venue_id: "CBSE",
 *   quantity: 0.1,
 *   notional: 6500,
 * });
 *
 * console.log(result.trace_id, result.authorized);
 * await client.close();
 * ```
 */

declare class IRLClient {
    private readonly irlUrl;
    private readonly mtaUrl;
    private readonly headers;
    private readonly timeoutMs;
    constructor(options: IRLClientOptions);
    /**
     * Fetch a fresh heartbeat and submit a trade intent for authorization.
     *
     * The heartbeat is fetched automatically — do NOT cache or reuse heartbeats
     * across calls. Each authorize request must carry a fresh heartbeat to satisfy
     * the L2 anti-replay invariant.
     *
     * @throws {IRLError} on 4xx/5xx responses from the IRL Engine
     * @throws {IRLHeartbeatError} if the heartbeat fetch fails
     */
    authorize(req: AuthorizeRequest): Promise<AuthorizeResult>;
    /**
     * Bind an exchange execution to a previously authorized trace.
     * Call this after your exchange confirms the order.
     */
    bindExecution(params: {
        trace_id: string;
        exchange_tx_id: string;
        execution_status: "Filled" | "PartialFill" | "Rejected" | "Expired";
        asset: string;
        executed_quantity: number;
        execution_price: number;
    }): Promise<{
        final_proof: string;
        status: string;
    }>;
    /** Retrieve a full trace by ID (forensic replay). */
    getTrace(trace_id: string): Promise<Record<string, unknown>>;
    /** Fetch the latest signed heartbeat from the MacroPulse MTA. */
    fetchHeartbeat(): Promise<Heartbeat>;
    /** No-op — included for symmetry with Python SDK's async context manager. */
    close(): Promise<void>;
    private buildBody;
    private fetch;
}
declare class IRLError extends Error {
    readonly status: number;
    readonly body: string;
    constructor(status: number, body: string);
}
declare class IRLHeartbeatError extends Error {
    readonly status: number;
    readonly body: string;
    constructor(status: number, body: string);
}

export { type AuthorizeRequest, type AuthorizeResult, type Heartbeat, IRLClient, type IRLClientOptions, IRLError, IRLHeartbeatError, type OrderType, type TradeAction };
