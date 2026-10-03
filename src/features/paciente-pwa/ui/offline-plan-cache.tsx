"use client";

import { useEffect } from "react";
import { cacheApprovedPlan, cachePatientIdentity } from "../infrastructure/offline-diary";

export type OfflinePlan = {
  patientId: string;
  patientName: string;
  planId: string;
  title: string;
  version: number;
  approvedAt: string;
  objective: string;
  meals: { name: string; time: string | null; items: { id: string; name: string; amount: string; notes: string; alternatives: { name: string; amount: string }[] }[] }[];
};

export function OfflinePlanCache({ userId, plan }: { userId: string; plan: OfflinePlan }) {
  useEffect(() => { void Promise.all([cachePatientIdentity(userId, plan.patientId, plan.patientName), cacheApprovedPlan(userId, plan.patientId, plan as unknown as Record<string, unknown>)]).catch(() => undefined); }, [plan, userId]);
  return null;
}
