import { useMemo, useState, useId } from "react";
import { useForm } from "react-hook-form";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import document from "../../../contracts/dashboard.forms.generated.json";
import type { DashboardSchemas } from "../../api/dashboard.generated";
import { DashboardError } from "../../api/dashboard";
import { ErrorSummary } from "./patterns";
type Property = {
  type?: string;
  title?: string;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
  anyOf?: Property[];
};
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addFormat("time", /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/);
ajv.addSchema(document, "dashboard");
export type Choice = { value: string; label: string };
export type FieldOptions = {
  label?: string;
  help?: string;
  choices?: Choice[];
  hidden?: boolean;
  multiline?: boolean;
};
const displayOrder: Record<string, string[]> = {
  Register: ["display_name", "email", "password", "clinic_name", "timezone"],
  ProfilePatch: [
    "name",
    "timezone",
    "confirm_timezone_change",
    "address_en",
    "address_ur",
    "preparation_en",
    "preparation_ur",
    "min_notice_min",
    "horizon_days",
    "cancellation_min",
    "daily_limit",
  ],
  ProviderCreate: ["name", "name_ur", "specialty"],
  ProviderPatch: ["name", "name_ur", "specialty", "active"],
  ServiceCreate: [
    "name",
    "name_ur",
    "duration_min",
    "price",
    "buffer_before_min",
    "buffer_after_min",
  ],
  ServicePatch: [
    "name",
    "name_ur",
    "duration_min",
    "price",
    "buffer_before_min",
    "buffer_after_min",
    "active",
  ],
  RuleCreate: ["weekday", "start_time", "end_time", "slot_min"],
  ExceptionCreate: ["kind", "start_date", "end_date", "start_time", "end_time"],
  UserCreate: ["email", "password", "role"],
  AvailabilityTemplate: [
    "start_date",
    "end_date",
    "start_time",
    "end_time",
    "break_start",
    "break_end",
  ],
};
type Name = keyof typeof document.components.schemas & keyof DashboardSchemas;
export function ContractForm<N extends Name>({
  schema,
  initial,
  onSave,
  submitLabel = "Save changes",
  fields = {},
  disabled = false,
  onSaved,
}: {
  schema: N;
  initial?: Partial<DashboardSchemas[N]>;
  onSave: (value: DashboardSchemas[N]) => Promise<unknown>;
  submitLabel?: string;
  fields?: Record<string, FieldOptions>;
  disabled?: boolean;
  onSaved?: () => void;
}) {
  const id = useId();
  const definition = document.components.schemas[schema] as {
    properties: Record<string, Property>;
    required?: string[];
  };
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(definition.properties).map(([name, p]) => [
          name,
          (initial as Record<string, unknown> | undefined)?.[name] ??
            p.default ??
            (p.type === "boolean" ? false : ""),
        ]),
      ),
    [definition, initial],
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({ defaultValues: defaults });
  const [failure, setFailure] = useState<unknown>(null),
    [saved, setSaved] = useState(false);
  const validate = useMemo(
    () =>
      ajv.compile<DashboardSchemas[N]>({
        $ref: `dashboard#/components/schemas/${schema}`,
      }),
    [schema],
  );
  return (
    <form
      className="contract-form"
      onSubmit={handleSubmit(async (values) => {
        setFailure(null);
        setSaved(false);
        const body: Record<string, unknown> = {};
        for (const [name, p] of Object.entries(definition.properties)) {
          const raw = values[name];
          const kind = p.type ?? p.anyOf?.find((x) => x.type !== "null")?.type;
          if (raw === "" || raw === undefined) {
            if (definition.required?.includes(name)) body[name] = "";
            else if (initial && Object.hasOwn(initial, name))
              body[name] =
                name === "name_ur" && p.anyOf?.some((x) => x.type === "null")
                  ? null
                  : "";
            continue;
          }
          body[name] =
            kind === "integer" || kind === "number"
              ? Number(raw)
              : kind === "boolean"
                ? !!raw
                : raw;
        }
        if (!validate(body)) {
          for (const error of validate.errors ?? []) {
            const name =
              error.instancePath.split("/")[1] ??
              String(error.params.missingProperty ?? "");
            setError(name, { message: error.message ?? "Check this value." });
          }
          setFailure(new Error("Check the highlighted fields."));
          return;
        }
        try {
          await onSave(body);
          setSaved(true);
          onSaved?.();
        } catch (error) {
          setFailure(error);
          if (error instanceof DashboardError)
            for (const [name, message] of Object.entries(error.fields))
              setError(name.replace(/^body\./, ""), { message });
        }
      })}
      noValidate
    >
      <ErrorSummary error={failure} />
      <fieldset disabled={disabled || isSubmitting}>
        <div className="form-grid">
          {Object.entries(definition.properties)
            .sort(([a], [b]) => {
              const order = displayOrder[schema] ?? [];
              return (
                (order.includes(a) ? order.indexOf(a) : 999) -
                (order.includes(b) ? order.indexOf(b) : 999)
              );
            })
            .map(([name, p]) => {
              const options = fields[name] ?? {};
              if (options.hidden) return null;
              const property = p.anyOf?.find((x) => x.type !== "null") ?? p;
              const type = property.type;
              const label =
                options.label ??
                name
                  .replaceAll("_", " ")
                  .replace(/\b\w/g, (x) => x.toUpperCase());
              const required = definition.required?.includes(name);
              const choices =
                options.choices ??
                property.enum?.map((value) => ({ value, label: value }));
              const controlId = `${id}-${name}`;
              const common = {
                ...(name.endsWith("_ur")
                  ? { lang: "ur", className: "urdu" }
                  : {}),
                id: controlId,
                "aria-invalid": !!errors[name],
                "aria-describedby": `${controlId}-help ${controlId}-error`,
                ...register(name),
              };
              return (
                <div
                  key={name}
                  className={`form-field ${options.multiline ? "wide" : ""}`}
                >
                  <label htmlFor={controlId}>
                    {label}
                    {required ? " *" : ""}
                  </label>
                  {choices ? (
                    <select {...common}>
                      <option value="">Select…</option>
                      {choices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  ) : type === "boolean" ? (
                    <input {...common} type="checkbox" />
                  ) : options.multiline ? (
                    <textarea
                      {...common}
                      rows={3}
                      maxLength={property.maxLength}
                      dir="auto"
                    />
                  ) : (
                    <input
                      {...common}
                      dir={property.format === "time" ? "ltr" : "auto"}
                      type={
                        name === "password"
                          ? "password"
                          : property.format === "email"
                            ? "email"
                            : property.format === "date"
                              ? "date"
                              : property.format === "time"
                                ? "time"
                                : type === "integer" || type === "number"
                                  ? "number"
                                  : "text"
                      }
                      min={property.minimum}
                      max={property.maximum}
                      minLength={property.minLength}
                      maxLength={property.maxLength}
                      step={type === "integer" ? 1 : "any"}
                      autoComplete={
                        name === "password"
                          ? "new-password"
                          : name === "email"
                            ? "email"
                            : "off"
                      }
                    />
                  )}
                  {options.help && (
                    <small id={`${controlId}-help`}>{options.help}</small>
                  )}
                  {errors[name] && (
                    <small className="field-error" id={`${controlId}-error`}>
                      {String(errors[name]?.message)}
                    </small>
                  )}
                </div>
              );
            })}
        </div>
        {!disabled && (
          <div className="form-actions">
            <button className="button" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : submitLabel}
            </button>
            {saved && <span role="status">Saved.</span>}
          </div>
        )}
      </fieldset>
    </form>
  );
}
