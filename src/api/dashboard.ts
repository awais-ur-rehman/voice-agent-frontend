import { z } from "zod";
import { API_URL } from "./client";
import type { DashboardOperations } from "./dashboard.generated";
export type Operation = keyof DashboardOperations;
export type Body<K extends Operation> = DashboardOperations[K]["body"];
export type Result<K extends Operation> = DashboardOperations[K]["response"];
export type RequestOptions<K extends Operation> = {
  body?: Body<K>;
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  idempotencyKey?: string;
};
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export class DashboardError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
  static async from(response: Response) {
    let code = "request_failed",
      message = `Request failed (${response.status}). Please try again.`,
      fields: Record<string, string> = {};
    try {
      const text = await response.text();
      if (text.length < 16000) {
        const body: unknown = JSON.parse(text);
        if (record(body) && record(body.error)) {
          const error = body.error;
          if (typeof error.code === "string") code = error.code;
          if (typeof error.message === "string" && error.message.length < 1000)
            message = error.message;
          if (record(error.details)) {
            const parsed = z
              .union([
                z.array(z.string().max(200)).max(100),
                z.record(z.string(), z.string().max(1000)),
              ])
              .safeParse(error.details.fields);
            if (parsed.success)
              fields = Array.isArray(parsed.data)
                ? Object.fromEntries(
                    parsed.data.map((name) => [name, "Check this value."]),
                  )
                : parsed.data;
          }
        }
      }
    } catch {
      /* Fall back without rendering an arbitrary response. */
    }
    return new DashboardError(response.status, code, message, fields);
  }
}
export async function http<K extends Operation>(
  operation: K,
  options: RequestOptions<K> = {},
  token?: string,
): Promise<Result<K>> {
  const [method, template] = operation.split(" ");
  let path = template!;
  for (const [key, value] of Object.entries(options.params ?? {}))
    path = path.replace(`{${key}}`, encodeURIComponent(value));
  if (path.includes("{")) throw Error("Missing route parameter");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {}))
    if (value !== undefined) query.set(key, String(value));
  const response = await fetch(
    `${API_URL}${path}${query.size ? "?" + query : ""}`,
    {
      method: method!,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      ...(options.signal ? { signal: options.signal } : {}),
      cache: "no-store",
      credentials: "omit",
    },
  );
  if (!response.ok) throw await DashboardError.from(response);
  return response.status === 204
    ? (undefined as Result<K>)
    : (response.json() as Promise<Result<K>>);
}
