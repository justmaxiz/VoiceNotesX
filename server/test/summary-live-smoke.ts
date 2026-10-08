// Opt-in diagnostic: sends only the synthetic records below, never database notes.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createProvider } from "../src/ai.js";
import { loadConfig } from "../src/config.js";
import { buildSummaryContext } from "../src/summaryFacts.js";
import { presetPeriod } from "../src/summaryContracts.js";
import { validateSummary } from "../src/summaryAI.js";
const now = new Date();
const context = buildSummaryContext(
  [
    {
      id: randomUUID(),
      title: "Подготовить синтетический макет",
      description: "Макет готов. Проверены два варианта интерфейса.",
      status: "completed",
      priority: "medium",
      categoryTag: "#Тест",
      isFocus: false,
      createdAt: new Date(+now - 60000).toISOString(),
      updatedAt: now.toISOString(),
      completedAt: new Date(+now - 10000).toISOString(),
    },
  ],
  presetPeriod("day", "Europe/Saratov", now),
  now,
);
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const response = await nativeFetch(...args);
  const data = await response
    .clone()
    .json()
    .catch(() => ({}));
  console.log(
    JSON.stringify({
      status: response.status,
      finishReason: data.candidates?.[0]?.finishReason,
      usage: data.usageMetadata,
      providerCode: data.error?.status,
    }),
  );
  if (process.env.SUMMARY_SMOKE_DEBUG === "1" && data.error)
    console.log(data.error.message);
  return response;
};
try {
  const raw = (await createProvider(loadConfig()).summarize!(context)) as {
    result: unknown;
  };
  if (process.env.SUMMARY_SMOKE_DEBUG === "1")
    console.log(JSON.stringify(raw.result));
  validateSummary(raw.result, context);
  console.log("Synthetic summary: valid");
} catch (error: any) {
  console.log(
    JSON.stringify({
      code: error.code || "UNEXPECTED",
      message: error.message,
    }),
  );
  process.exitCode = 1;
} finally {
  globalThis.fetch = nativeFetch;
}
