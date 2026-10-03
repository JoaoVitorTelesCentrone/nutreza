import "server-only";
import { z } from "zod";

const taskSchemas = {
  resumo: z.object({ fatos: z.array(z.object({ texto: z.string().max(500), referencia: z.string().max(120) })).max(20), lacunas: z.array(z.string().max(300)).max(10), alertas: z.array(z.string().max(300)).max(10) }),
  nota: z.object({ queixa: z.string().max(4000), avaliacao: z.string().max(4000), conduta: z.string().max(4000), pendencias: z.array(z.string().max(300)).max(10), referencias: z.array(z.string().max(120)).max(20) }),
  plano: z.object({ titulo: z.string().max(160), objetivo: z.string().max(2000), itens: z.array(z.object({ alimento_id: z.string().uuid(), refeicao: z.string().max(80), gramas: z.number().positive().max(100000), observacao: z.string().max(500) })).max(100), referencias: z.array(z.string().max(120)).max(20) }),
};

export type TecaGeneration = { data: Record<string, unknown>; provider: string; model: string; promptVersion: string; inputTokens: number; outputTokens: number; costCents: number };

function schemaFor(task: keyof typeof taskSchemas) { return z.toJSONSchema(taskSchemas[task], { target: "draft-07" }); }

function simulated(task: keyof typeof taskSchemas, context: Record<string, unknown>): TecaGeneration {
  if (task === "resumo") return { data: { fatos: [{ texto: "Revise os dados clínicos disponíveis antes da consulta.", referencia: "contexto:prontuario" }], lacunas: ["A geração simulada não substitui revisão clínica."], alertas: [] }, provider: "simulado", model: "local", promptVersion: "teca-v1", inputTokens: JSON.stringify(context).length, outputTokens: 50, costCents: 0 };
  if (task === "nota") return { data: { queixa: "", avaliacao: "", conduta: "", pendencias: ["Preencha a nota com o relato da consulta."], referencias: [] }, provider: "simulado", model: "local", promptVersion: "teca-v1", inputTokens: JSON.stringify(context).length, outputTokens: 30, costCents: 0 };
  return { data: { titulo: "Rascunho de plano sugerido pela Teca", objetivo: "Revise metas e itens antes de aprovar.", itens: [], referencias: [] }, provider: "simulado", model: "local", promptVersion: "teca-v1", inputTokens: JSON.stringify(context).length, outputTokens: 40, costCents: 0 };
}

export async function generateWithLlm(task: keyof typeof taskSchemas, context: Record<string, unknown>, config: { provider: string; model: string; limitTokens: number }): Promise<TecaGeneration> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || config.provider === "simulado") return simulated(task, context);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: config.model, store: false, max_output_tokens: Math.min(config.limitTokens, 20000), input: [
      { role: "system", content: "Você é a Teca, copiloto de um nutricionista. Gere somente rascunhos estruturados. Não diagnostique, não prescreva como autoridade, não invente fatos ou fontes. Use apenas IDs e referências presentes no contexto. A decisão final é sempre do nutricionista." },
      { role: "user", content: `Tarefa: ${task}. Contexto autorizado em JSON:\n${JSON.stringify(context)}` },
    ], text: { format: { type: "json_schema", name: `teca_${task}`, strict: true, schema: schemaFor(task) } } }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Provedor de IA indisponível (${response.status})`);
  const payload = await response.json() as { output_text?: string; usage?: { input_tokens?: number; output_tokens?: number } };
  const parsed = taskSchemas[task].safeParse(JSON.parse(payload.output_text ?? "{}"));
  if (!parsed.success) throw new Error("Resposta estruturada inválida");
  const inputTokens = payload.usage?.input_tokens ?? 0; const outputTokens = payload.usage?.output_tokens ?? 0;
  return { data: parsed.data, provider: "openai", model: config.model, promptVersion: "teca-v1", inputTokens, outputTokens, costCents: Math.ceil((inputTokens + outputTokens) / 1000) };
}
