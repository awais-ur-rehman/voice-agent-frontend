import { z } from "zod";
import { API_URL } from "./client";
import forms from "../../contracts/dashboard.forms.generated.json";
import {
  fetchResponse,
  isRecord,
  readErrorBody,
  readResponseJson,
  retryAfter,
  safeFailure,
} from "./errors";
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
  checksum?: string;
};
const formFieldNames = new Set([
  ...Object.values(forms.components.schemas).flatMap((schema) =>
    Object.keys(schema.properties),
  ),
  // Knowledge source forms are hand-written rather than generated.
  "format",
  "text",
  "question",
  "answer",
  "url",
]);
const slotAlternatives = z
  .array(
    z
      .object({
        starts_at: z.iso.datetime({ offset: true }),
        ends_at: z.iso.datetime({ offset: true }),
        provider_id: z.string().uuid(),
        service_id: z.string().uuid(),
      })
      .refine((slot) => Date.parse(slot.starts_at) < Date.parse(slot.ends_at)),
  )
  .max(100);

function validationFields(value: unknown): Record<string, string> {
  const names = Array.isArray(value)
    ? value
    : isRecord(value)
      ? Object.keys(value).filter((key) => typeof value[key] === "string")
      : [];
  return Object.fromEntries(
    names.flatMap((name) =>
      typeof name === "string" &&
      formFieldNames.has(name.replace(/^body\./, ""))
        ? [[name, "Check this value."]]
        : [],
    ),
  );
}

export class DashboardError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly alternatives: z.infer<typeof slotAlternatives> = [],
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }

  static async from(response: Response, signal?: AbortSignal) {
    const body = await readErrorBody(response, 16 * 1024, signal);
    const error = isRecord(body?.error) ? body.error : undefined;
    const details = isRecord(error?.details) ? error.details : undefined;
    const seconds = retryAfter(response);
    const { code, message } = safeFailure(
      response.status,
      error?.code,
      seconds,
    );
    const fields =
      code === "validation_error" ||
      code === "validation_failed" ||
      code === "revision_conflict"
        ? validationFields(details?.fields)
        : {};
    const alternatives =
      code === "slot_unavailable"
        ? slotAlternatives.safeParse(details?.alternatives).data
        : undefined;
    return new DashboardError(
      response.status,
      code,
      message,
      fields,
      alternatives,
      seconds,
    );
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
  const binary = options.body instanceof Blob;
  if (binary && !/^[a-f0-9]{64}$/i.test(options.checksum ?? ""))
    throw Error("A SHA256 checksum is required for a binary upload.");
  const response = await fetchResponse(
    `${API_URL}${path}${query.size ? "?" + query : ""}`,
    {
      method: method!,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body === undefined
          ? {}
          : {
              "Content-Type": binary
                ? "application/octet-stream"
                : "application/json",
            }),
        ...(binary ? { "X-Content-SHA256": options.checksum! } : {}),
        ...(options.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : {}),
      },
      ...(options.body === undefined
        ? {}
        : {
            body: binary
              ? (options.body as Blob)
              : JSON.stringify(options.body),
          }),
      ...(options.signal ? { signal: options.signal } : {}),
      cache: "no-store",
      credentials: "omit",
    },
  );
  if (!response.ok) throw await DashboardError.from(response, options.signal);
  return response.status === 204
    ? (undefined as Result<K>)
    : readResponseJson<Result<K>>(response, options.signal);
}
