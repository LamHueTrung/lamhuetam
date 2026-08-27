import { Handler } from "@netlify/functions";

const BASE_URL = process.env.ML_FORECASTING_URL || "https://ml-finance-forecasting.onrender.com";
const API_KEY = process.env.API_KEY_ML_FORECASTING || process.env.ML_FORECASTING_API_KEY || "lamhuetrung080103110121255";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Action",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// In-memory cache: 5 minutes TTL
interface CacheEntry {
  timestamp: number;
  data: any;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod === "GET") {
    // Health check endpoint
    try {
      const resp = await fetch(`${BASE_URL}/health`, { method: "GET" });
      const data = await resp.json();
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ status: "ok", ml_service: data }),
      };
    } catch (err: any) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "ML Service unavailable", message: err.message }),
      };
    }
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const rawBody = event.body ? JSON.parse(event.body) : {};
    const action = event.headers["x-action"] || rawBody.action || "forecast";
    const payload = rawBody.payload !== undefined ? rawBody.payload : rawBody;

    // Target endpoint mapping
    let endpoint = "/forecast";
    if (action === "anomalies") endpoint = "/anomalies";
    else if (action === "patterns") endpoint = "/patterns";
    else if (action === "solve-deficit" || action === "solve_deficit") endpoint = "/solve-deficit";

    // Cache key based on endpoint and hash of payload
    const cacheKey = `${endpoint}_${JSON.stringify(payload)}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cached.data, _cached: true }),
      };
    }

    const mlResponse = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (mlResponse.status === 401) {
      console.error("[ML-Forecasting] 401 Unauthorized: Invalid API Key");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized: Invalid ML Forecasting API Key" }),
      };
    }

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      return {
        statusCode: mlResponse.status,
        headers,
        body: JSON.stringify({ error: "ML Service Error", detail: errorText }),
      };
    }

    const data = await mlResponse.json();

    // Cache success responses
    cache.set(cacheKey, { timestamp: now, data });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error("[ML-Forecasting] Proxy Exception:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Proxy Error", message: error.message }),
    };
  }
};
