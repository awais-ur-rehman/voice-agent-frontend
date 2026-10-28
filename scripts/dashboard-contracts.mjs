import { readFile, writeFile } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";
const source = new URL("../contracts/dashboard.v1.json", import.meta.url);
const raw = await readFile(source, "utf8");
const document = JSON.parse(raw);
const rename = (name) => name.replace(/[^A-Za-z0-9_]/g, "_");
const defs = JSON.parse(
  JSON.stringify(document.components.schemas).replaceAll(
    "#/components/schemas/",
    "#/$defs/",
  ),
);
// Give input/output variants distinct names; never conflate legacy and v2 config.
for (const [name, value] of Object.entries(defs)) value.title = rename(name);
const properties = Object.fromEntries(
  Object.keys(defs).map((name) => [name, { $ref: `#/$defs/${name}` }]),
);
const schema = {
  type: "object",
  additionalProperties: false,
  $defs: defs,
  properties,
  required: Object.keys(defs),
};
let output = await compile(schema, "DashboardSchemas", {
  bannerComment:
    "/* Generated from contracts/dashboard.v1.json. Do not edit. */",
  additionalProperties: false,
});
const type = (value) =>
  !value
    ? "undefined"
    : value.$ref
      ? `DashboardSchemas[${JSON.stringify(value.$ref.split("/").at(-1))}]`
      : value.type === "array"
        ? `Array<${type(value.items)}>`
        : value.type === "string"
          ? "string"
          : value.type === "boolean"
            ? "boolean"
            : ["integer", "number"].includes(value.type)
              ? "number"
              : "unknown";
output += "\nexport interface DashboardOperations {\n";
for (const [path, methods] of Object.entries(document.paths))
  for (const [method, op] of Object.entries(methods)) {
    const response = Object.entries(op.responses).find(([code]) =>
      code.startsWith("2"),
    )?.[1];
    output += `${JSON.stringify(method.toUpperCase() + " " + path)}: { body: ${type(op.requestBody?.content?.["application/json"]?.schema)}; response: ${type(response?.content?.["application/json"]?.schema)} };\n`;
  }
output += "}\n";
// Match the repository formatter so generation and formatting commute.
const { format } = await import("prettier");
output = await format(output, { parser: "typescript" });
const target = new URL("../src/api/dashboard.generated.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8")) !== output)
    throw Error("Dashboard types drifted; run contracts:generate");
  try {
    if (
      (await readFile(
        new URL(
          "../../backend/packages/schemas/dashboard.v1.json",
          import.meta.url,
        ),
        "utf8",
      )) !== raw
    )
      throw Error("Dashboard contract differs from backend");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
} else await writeFile(target, output);

// Ship only the schemas used by the shared clinic/auth forms to the browser.
// Agent/version unions remain in the complete generated type artifact.
const formNames = [
  "Login",
  "Register",
  "ProfilePatch",
  "ProviderCreate",
  "ProviderPatch",
  "ServiceCreate",
  "ServicePatch",
  "RuleCreate",
  "ExceptionCreate",
  "UserCreate",
  "AvailabilityTemplate",
];
const forms =
  JSON.stringify(
    {
      components: {
        schemas: Object.fromEntries(
          formNames.map((name) => [name, document.components.schemas[name]]),
        ),
      },
    },
    null,
    2,
  ) + "\n";
const formsTarget = new URL(
  "../contracts/dashboard.forms.generated.json",
  import.meta.url,
);
if (process.argv.includes("--check")) {
  if ((await readFile(formsTarget, "utf8")) !== forms)
    throw Error("Dashboard form schemas drifted");
} else await writeFile(formsTarget, forms);
