"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  IRLClient: () => IRLClient,
  IRLError: () => IRLError,
  IRLHeartbeatError: () => IRLHeartbeatError
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var IRLClient = class {
  constructor(options) {
    this.irlUrl = options.irlUrl.replace(/\/$/, "");
    this.mtaUrl = (options.mtaUrl ?? "https://api.macropulse.live").replace(/\/$/, "");
    this.headers = {
      Authorization: `Bearer ${options.apiToken}`,
      "Content-Type": "application/json"
    };
    this.timeoutMs = options.timeoutMs ?? 5e3;
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
  async authorize(req) {
    const heartbeat = await this.fetchHeartbeat();
    const body = this.buildBody(req, heartbeat);
    const resp = await this.fetch(`${this.irlUrl}/irl/authorize`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLError(resp.status, text);
    }
    const data = await resp.json();
    return {
      trace_id: data["trace_id"],
      reasoning_hash: data["reasoning_hash"],
      authorized: data["authorized"],
      shadow_blocked: data["shadow_blocked"] ?? false
    };
  }
  /**
   * Bind an exchange execution to a previously authorized trace.
   * Call this after your exchange confirms the order.
   */
  async bindExecution(params) {
    const resp = await this.fetch(`${this.irlUrl}/irl/bind-execution`, {
      method: "POST",
      body: JSON.stringify(params)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLError(resp.status, text);
    }
    const data = await resp.json();
    return {
      final_proof: data["final_proof"],
      status: data["status"]
    };
  }
  /** Retrieve a full trace by ID (forensic replay). */
  async getTrace(trace_id) {
    const resp = await this.fetch(`${this.irlUrl}/irl/trace/${trace_id}`);
    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLError(resp.status, text);
    }
    return resp.json();
  }
  /** Fetch the latest signed heartbeat from the MacroPulse MTA. */
  async fetchHeartbeat() {
    const resp = await this.fetch(`${this.mtaUrl}/v1/irl/heartbeat`, {
      headers: {}
      // no auth needed for heartbeat
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new IRLHeartbeatError(resp.status, text);
    }
    return resp.json();
  }
  /** No-op — included for symmetry with Python SDK's async context manager. */
  async close() {
  }
  buildBody(req, heartbeat) {
    const action = serializeAction(req.action, req.quantity);
    const body = {
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
      multiplier: req.multiplier ?? 1,
      reduce_only: req.reduce_only ?? false,
      client_order_id: req.client_order_id ?? "",
      agent_valid_time: req.agent_valid_time ?? Date.now(),
      heartbeat
    };
    if (req.limit_price !== void 0) body["limit_price"] = req.limit_price;
    if (req.stop_price !== void 0) body["stop_price"] = req.stop_price;
    return body;
  }
  fetch(url, init = {}) {
    const signal = AbortSignal.timeout(this.timeoutMs);
    return globalThis.fetch(url, {
      ...init,
      headers: { ...this.headers, ...init.headers },
      signal
    });
  }
};
function serializeAction(action, quantity) {
  if (action === "Long") return { Long: quantity };
  if (action === "Short") return { Short: quantity };
  return "Neutral";
}
var IRLError = class extends Error {
  constructor(status, body) {
    super(`IRL Engine error ${status}: ${body}`);
    this.status = status;
    this.body = body;
    this.name = "IRLError";
  }
};
var IRLHeartbeatError = class extends Error {
  constructor(status, body) {
    super(`Heartbeat fetch failed ${status}: ${body}`);
    this.status = status;
    this.body = body;
    this.name = "IRLHeartbeatError";
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  IRLClient,
  IRLError,
  IRLHeartbeatError
});
