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

import type {
  AuthorizeRequest,
  AuthorizeResult,
  Heartbeat,
  IRLClientOptions,
  TradeAction,
} from "./models.js";

export class IRLClient {
  private readonly irlUrl: string;
  private readonly mtaUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(options: IRLClientOptions) {
    this.irlUrl = options.irlUrl.replace(/\/$/, "");
    this.mtaUrl = (options.mtaUrl ?? "https://api.macropulse.live").replace(/\/$/, "");
    this.headers = {
      Authorization: `Bearer ${options.apiToken}`,
      "Content-Type": "application/json",
    };
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

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
  async authorize(req: AuthorizeRequest): Promise<AuthorizeResult> {
    const heartbeat = await this.fetchHeartbeat();

    const body = this.buildBody(req, heartbeat);

    const resp = await this.fetch(`${this.irlUrl}/irl/authorize`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLError(resp.status, text);
    }

    const data = await resp.json() as Record<string, unknown>;
    return {
      trace_id: data["trace_id"] as string,
      reasoning_hash: data["reasoning_hash"] as string,
      authorized: data["authorized"] as boolean,
      shadow_blocked: (data["shadow_blocked"] as boolean | undefined) ?? false,
    };
  }

  /**
   * Bind an exchange execution to a previously authorized trace.
   * Call this after your exchange confirms the order.
   */
  async bindExecution(params: {
    trace_id: string;
    exchange_tx_id: string;
    execution_status: "Filled" | "PartialFill" | "Rejected" | "Expired";
    asset: string;
    executed_quantity: number;
    execution_price: number;
  }): Promise<{ final_proof: string; status: string }> {
    const resp = await this.fetch(`${this.irlUrl}/irl/bind-execution`, {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLError(resp.status, text);
    }

    const data = await resp.json() as Record<string, unknown>;
    return {
      final_proof: data["final_proof"] as string,
      status: data["status"] as string,
    };
  }

  /** Retrieve a full trace by ID (forensic replay). */
  async getTrace(trace_id: string): Promise<Record<string, unknown>> {
    const resp = await this.fetch(`${this.irlUrl}/irl/trace/${trace_id}`);
    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLError(resp.status, text);
    }
    return resp.json() as Promise<Record<string, unknown>>;
  }

  /** Fetch the latest signed heartbeat from the MacroPulse MTA. */
  async fetchHeartbeat(): Promise<Heartbeat> {
    const resp = await this.fetch(`${this.mtaUrl}/v1/irl/heartbeat`, {
      headers: {},   // no auth needed for heartbeat
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLHeartbeatError(resp.status, text);
    }
    return resp.json() as Promise<Heartbeat>;
  }

  /** No-op — included for symmetry with Python SDK's async context manager. */
  async close(): Promise<void> {}

  private buildBody(req: AuthorizeRequest, heartbeat: Heartbeat): Record<string, unknown> {
    const action = serializeAction(req.action, req.quantity);

    const body: Record<string, unknown> = {
      agent_id: req.agent_id,
      model_id: req.model_id,
      model_hash_hex: req.model_hash_hex,
      prompt_version: req.prompt_version ?? "v1",
      feature_schema_id: req.feature_schema_id ?? "default",
      hyperparameter_checksum: req.hyperparameter_checksum ?? "0".repeat(64),
      action,
      asset: req.asset,
      order_type: req.order_type ?? "MARKET",
      venue_id: req.venue_id,
      quantity: req.quantity,
      notional: req.notional,
      notional_currency: req.notional_currency ?? "USD",
      multiplier: req.multiplier ?? 1.0,
      reduce_only: req.reduce_only ?? false,
      client_order_id: req.client_order_id ?? "",
      agent_valid_time: req.agent_valid_time ?? Date.now(),
      heartbeat,
    };

    if (req.limit_price !== undefined) body["limit_price"] = req.limit_price;
    if (req.stop_price !== undefined) body["stop_price"] = req.stop_price;

    return body;
  }

  private fetch(url: string, init: RequestInit & { headers?: Record<string, string> } = {}): Promise<Response> {
    const signal = AbortSignal.timeout(this.timeoutMs);
    return globalThis.fetch(url, {
      ...init,
      headers: { ...this.headers, ...init.headers },
      signal,
    });
  }
}

function serializeAction(action: TradeAction, quantity: number): unknown {
  if (action === "Long") return { Long: quantity };
  if (action === "Short") return { Short: quantity };
  return "Neutral";
}

export class IRLError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`IRL Engine error ${status}: ${body}`);
    this.name = "IRLError";
  }
}

export class IRLHeartbeatError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Heartbeat fetch failed ${status}: ${body}`);
    this.name = "IRLHeartbeatError";
  }
}
