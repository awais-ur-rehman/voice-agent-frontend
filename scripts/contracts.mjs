import { readFile, writeFile } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";
const path = new URL("../contracts/voice.v1.json", import.meta.url);
const raw = await readFile(path, "utf8");
const schema = JSON.parse(raw);
const browserNames = [
  "MediaGrant",
  "VoiceCreate",
  "VoiceSnapshot",
  "PlaybackAck",
  "CallControl",
  "VoiceStateMessage",
  "CaptionMessage",
  "SegmentMessage",
  "SegmentEndMessage",
  "InvalidateMessage",
];
const safe = {
  $schema: schema.$schema,
  title: "BrowserVoice",
  type: "object",
  additionalProperties: false,
  $defs: Object.fromEntries(
    browserNames.map((name) => [name, schema.$defs[name]]),
  ),
  properties: Object.fromEntries(
    browserNames.map((name) => [name, { $ref: `#/$defs/${name}` }]),
  ),
};
const output = await compile(safe, "BrowserVoice", {
  bannerComment:
    "/* Generated from contracts/voice.v1.json. Do not edit. Browser allowlist excludes WorkerGrant. */",
  additionalProperties: false,
});
const target = new URL("../src/api/voice.generated.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8")) !== output)
    throw Error(
      "Generated voice types drifted; run npm run contracts:generate",
    );
  try {
    const upstream = await readFile(
      new URL("../../backend/packages/schemas/voice.v1.json", import.meta.url),
      "utf8",
    );
    if (raw !== upstream)
      throw Error(
        "Backend contract drift; refresh contracts/voice.v1.json and generate",
      );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
} else await writeFile(target, output);
