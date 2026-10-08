import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider, validateStructure } from "../src/ai.js";
import { loadConfig } from "../src/config.js";
import {
  inspectAudio,
  MAX_AUDIO_BYTES,
  structuredToNote,
} from "../src/audio.js";
import { speechKitAudio } from "../src/media.js";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, readFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildSummaryContext } from "../src/summaryFacts.js";
import { presetPeriod } from "../src/summaryContracts.js";
const config = (provider: "gemini" | "alice") =>
  loadConfig({
    NODE_ENV: provider === "alice" ? "production" : "test",
    CORS_ORIGINS: "https://example.invalid",
    DATABASE_URL: "postgresql://test:test@localhost/voicenotes_test",
    JWT_SECRET: "test-signing-secret-32-bytes-long-string",
    AI_PROVIDER: provider,
    GEMINI_API_KEY: "synthetic-key",
    GEMINI_MODEL: "gemini-3.5-flash-lite",
    YANDEX_API_KEY: "synthetic-yandex-key",
    YANDEX_FOLDER_ID: "test-folder",
  });
const note = {
  title: "Синтетический запрос",
  description: "Тест",
  priority: "medium",
  category_tag: "#Тест",
  transcript_summary: "Тест",
  due_date: null,
};
test("summary adapters have separate operation, output budget and usage metadata for both providers", async () => {
  const original = globalThis.fetch;
  const context = buildSummaryContext(
    [],
    presetPeriod("day", "UTC"),
    new Date(),
  );
  try {
    for (const name of ["gemini", "alice"] as const) {
      globalThis.fetch = async (input, init) => {
        const b = JSON.parse(init!.body as string);
        if (name === "gemini") {
          assert.equal(b.generationConfig.maxOutputTokens, 2400);
          assert.deepEqual(
            b.generationConfig.responseJsonSchema.properties.highlights.items
              .required,
            ["text", "noteIds", "factIds"],
          );
          assert.ok(
            b.systemInstruction.parts[0].text.includes("недоверенные данные"),
          );
          return new Response(
            JSON.stringify({
              candidates: [
                { content: { parts: [{ text: '{"schemaVersion":1}' }] } },
              ],
              usageMetadata: {
                promptTokenCount: 100,
                candidatesTokenCount: 20,
              },
            }),
          );
        }
        assert.equal(b.max_completion_tokens, 2400);
        assert.ok(String(input).includes("yandex"));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"schemaVersion":1}' } }],
            usage: { prompt_tokens: 100, completion_tokens: 20 },
          }),
        );
      };
      const result = (await createProvider(config(name)).summarize!(
        context,
      )) as any;
      assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 20 });
      assert.equal(result.result.schemaVersion, 1);
    }
  } finally {
    globalThis.fetch = original;
  }
});
test("explicit task duration survives validation and audio conversion", () => {
  const result = validateStructure({
    ...note,
    deadline: "2026-10-08T11:00:00+04:00",
    estimated_minutes: 120,
  });
  assert.equal(structuredToNote(result).estimatedMinutes, 120);
  for (const estimated_minutes of [0, -1, 525601, "120", null]) {
    assert.throws(() => validateStructure({ ...note, estimated_minutes }));
  }
});
test("Gemini and Alice adapters use separate endpoints with server credentials", async () => {
  const original = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      calls++;
      const payload = JSON.parse(init!.body as string);
      if (String(input).includes("googleapis")) {
        assert.equal(
          String(input),
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        );
        assert.equal((init!.headers as any)["x-goog-api-key"], "synthetic-key");
        assert.ok(
          payload.systemInstruction.parts[0].text.includes("start_date"),
        );
        return new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(note) }] } },
            ],
          }),
        );
      }
      assert.equal(
        String(input),
        "https://ai.api.cloud.yandex.net/v1/chat/completions",
      );
      assert.equal(payload.model, "gpt://test-folder/aliceai-llm");
      assert.equal(
        (init!.headers as any).Authorization,
        "Api-Key synthetic-yandex-key",
      );
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(note) } }],
        }),
      );
    };
    for (const provider of ["gemini", "alice"] as const)
      assert.equal(
        (
          await createProvider(config(provider)).structure(
            "Синтетический запрос",
            {},
          )
        ).title,
        note.title,
      );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
test("provider empty, malformed JSON, unavailable and timeout stay explicit", async () => {
  const original = globalThis.fetch;
  const provider = createProvider(config("gemini"));
  try {
    for (const text of ["", "{", JSON.stringify({ ...note, title: "" })]) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
        );
      await assert.rejects(provider.structure("Синтетика", {}), (error: any) =>
        ["AI_EMPTY_RESPONSE", "AI_INVALID_RESPONSE"].includes(error.code),
      );
    }
    globalThis.fetch = async () => new Response("{}", { status: 503 });
    await assert.rejects(
      provider.structure("Синтетика", {}),
      (error: any) => error.code === "AI_UNAVAILABLE",
    );
    globalThis.fetch = async () => {
      throw new DOMException("Timeout", "TimeoutError");
    };
    await assert.rejects(
      provider.structure("Синтетика", {}),
      (error: any) => error.code === "AI_TIMEOUT",
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("all mode/style combinations send distinct instructions for both providers and audio analysis", async () => {
  const original = globalThis.fetch;
  try {
    for (const name of ["gemini", "alice"] as const) {
      const prompts = new Set<string>();
      let captured = "";
      globalThis.fetch = async (_input, init) => {
        const body = JSON.parse(init!.body as string);
        captured =
          name === "gemini"
            ? body.systemInstruction.parts[0].text
            : body.messages[0].content;
        const result = captured.includes('"candidates":[]')
          ? { summary: "Тест", candidates: [note] }
          : note;
        return new Response(
          JSON.stringify(
            name === "gemini"
              ? {
                  candidates: [
                    { content: { parts: [{ text: JSON.stringify(result) }] } },
                  ],
                }
              : { choices: [{ message: { content: JSON.stringify(result) } }] },
          ),
        );
      };
      const provider = createProvider(config(name));
      for (const mode of ["fast", "deep"] as const) {
        for (const style of ["concise", "detailed", "action_plan"] as const) {
          await provider.structure("Синтетический текст", { mode, style });
          prompts.add(captured);
          assert.ok(
            captured.includes(
              mode === "fast"
                ? "прямую структуризацию"
                : "целях, причинах, ограничениях",
            ),
          );
          assert.ok(
            captured.includes(
              style === "concise"
                ? "1–2 коротких предложений"
                : style === "detailed"
                  ? "весь существенный контекст"
                  : "начиная с глагола",
            ),
          );
          assert.ok(captured.includes("deadline оставляй null"));
          assert.ok(captured.includes("estimated_minutes 120"));
        }
      }
      assert.equal(prompts.size, 6);
      await provider.structure("Синтетический текст", {});
      const defaultPrompt = captured;
      await provider.structure("Синтетический текст", {
        mode: "fast",
        style: "concise",
      });
      assert.equal(captured, defaultPrompt);
      await provider.analyze("Синтетический текст", {
        mode: "deep",
        style: "detailed",
      });
      assert.ok(captured.includes("целях, причинах, ограничениях"));
      assert.ok(captured.includes("весь существенный контекст"));
      assert.ok(captured.includes("полю summary"));
      assert.ok(captured.includes("estimated_minutes 120"));
    }
  } finally {
    globalThis.fetch = original;
  }
});
function wav(seconds = 1, rate = 16000) {
  const bytes = Buffer.alloc(44 + seconds * rate * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
}
test("production SpeechKit adapter uploads Opus and joins final recognition chunks", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      assert.equal(
        (init!.headers as any).Authorization,
        "Api-Key synthetic-yandex-key",
      );
      assert.equal((init!.headers as any)["x-folder-id"], "test-folder");
      if (url.endsWith("recognizeFileAsync")) {
        const body = JSON.parse(init!.body as string);
        assert.equal(
          Buffer.from(body.content, "base64").subarray(0, 4).toString(),
          "OggS",
        );
        assert.equal(
          body.recognitionModel.audioFormat.containerAudio.containerAudioType,
          "OGG_OPUS",
        );
        return new Response(JSON.stringify({ id: "synthetic-operation" }));
      }
      if (url.includes("/operations/"))
        return new Response(JSON.stringify({ done: true }));
      assert.ok(url.includes("getRecognition?operationId=synthetic-operation"));
      return new Response(
        ["Синтетическая", "речь"]
          .map((text) =>
            JSON.stringify({ result: { final: { alternatives: [{ text }] } } }),
          )
          .join("\n"),
      );
    };
    assert.equal(
      await createProvider(config("alice")).transcribe(wav(), "audio/wav"),
      "Синтетическая речь",
    );
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = original;
  }
});
test("development Gemini uses Files API for large audio and deletes uploaded file", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method || "GET"} ${url}`);
      if (url.includes("/upload/v1beta/files"))
        return new Response("{}", {
          headers: {
            "x-goog-upload-url":
              "https://generativelanguage.googleapis.com/upload/synthetic",
          },
        });
      if (url.endsWith("/upload/synthetic"))
        return new Response(
          JSON.stringify({
            file: {
              name: "files/synthetic",
              state: "ACTIVE",
              uri: "https://generativelanguage.googleapis.com/v1beta/files/synthetic",
            },
          }),
        );
      if (init?.method === "DELETE") return new Response("{}");
      const payload = JSON.parse(init!.body as string);
      assert.ok(payload.contents[0].parts.some((part: any) => part.fileData));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({ transcript: "Синтетическая речь" }),
                  },
                ],
              },
            },
          ],
        }),
      );
    };
    assert.equal(
      await createProvider(config("gemini")).transcribe(
        Buffer.alloc(11 * 1024 * 1024),
        "audio/wav",
      ),
      "Синтетическая речь",
    );
    assert.ok(calls.at(-1)?.startsWith("DELETE "));
  } finally {
    globalThis.fetch = original;
  }
});
test("real media inspection rejects formats, size and duration before AI", async () => {
  assert.equal((await inspectAudio(wav())).duration, 1);
  assert.equal((await inspectAudio(wav(7200, 1))).duration, 7200);
  await assert.rejects(
    inspectAudio(Buffer.from("not audio")),
    (error: any) => error.code === "AUDIO_FORMAT",
  );
  await assert.rejects(
    inspectAudio(Buffer.alloc(MAX_AUDIO_BYTES + 1)),
    (error: any) => error.code === "AUDIO_SIZE",
  );
  await assert.rejects(
    inspectAudio(wav(7201, 1)),
    (error: any) => error.code === "AUDIO_DURATION",
  );
  const converted = await speechKitAudio(wav());
  assert.equal(converted.subarray(0, 4).toString(), "OggS");
});
test("real MP3, M4A, WebM and OGG are accepted after decoding metadata", async () => {
  const directory = await mkdtemp(join(tmpdir(), "voicenotes-formats-"));
  const source = join(directory, "synthetic.wav");
  const generated: string[] = [];
  const ffmpeg =
    process.env.FFMPEG_PATH || createRequire(import.meta.url)("ffmpeg-static");
  try {
    await writeFile(source, wav());
    for (const [extension, mime] of [
      ["mp3", "audio/mpeg"],
      ["m4a", "audio/mp4"],
      ["webm", "audio/webm"],
      ["ogg", "audio/ogg"],
    ]) {
      const output = join(directory, `synthetic.${extension}`);
      generated.push(output);
      await promisify(execFile)(
        ffmpeg,
        ["-v", "error", "-nostdin", "-i", source, output],
        { timeout: 30000, windowsHide: true },
      );
      const result = await inspectAudio(await readFile(output));
      assert.equal(result.mime, mime);
      assert.ok(result.duration >= 1 && result.duration < 1.2);
    }
  } finally {
    for (const path of [source, ...generated])
      await unlink(path).catch(() => {});
    await rmdir(directory);
  }
});
