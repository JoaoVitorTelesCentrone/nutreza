import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";

const service = z.object({ id: z.uuid(), nome: z.string(), tipo: z.string(), duracao_minutos: z.number() });
const publicInfo = z.object({ clinica: z.string(), timezone: z.string(), servicos: z.array(service) });
export type PublicAgendaInfo = z.infer<typeof publicInfo>;

export async function getPublicAgenda(slug: string): Promise<PublicAgendaInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agenda_info", { p_slug: slug });
  if (error) return null;
  const parsed = publicInfo.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getSlots(slug: string, serviceId: string, day: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agenda_horarios", {
    p_slug: slug, p_servico: serviceId, p_dia: day,
  });
  return error ? [] : data ?? [];
}

export async function getInternalSlots(serviceId: string, day: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agenda_horarios_internos", {
    p_servico: serviceId, p_dia: day,
  });
  return error ? [] : data ?? [];
}
