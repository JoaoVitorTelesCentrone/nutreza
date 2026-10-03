"use client";

import Link from "next/link";
import { useTransition } from "react";
import { rescheduleBooking } from "../application/actions";
import { zonedLocalToUtc } from "../domain/timezone";

export function DraggableBooking({ id, active, className, children }: { id: string; active: boolean; className: string; children: React.ReactNode }) {
  return <Link href={`/app/agenda/${id}`} prefetch={false} draggable={active} onDragStart={active ? (event) => {
    event.dataTransfer.setData("application/x-nutreza-booking", id);
    event.dataTransfer.effectAllowed = "move";
  } : undefined} className={className} title={active ? "Arraste para remarcar ou abra para escolher um horário pelo formulário" : undefined}>{children}</Link>;
}

export function DropHour({ day, hour, timezone, children }: { day: string; hour: number; timezone: string; children: React.ReactNode }) {
  const [pending, startTransition] = useTransition();
  return <div className={`min-w-0 space-y-1 border-l border-line p-1 ${pending ? "opacity-60" : ""}`} onDragOver={(event) => {
    if (event.dataTransfer.types.includes("application/x-nutreza-booking")) event.preventDefault();
  }} onDrop={(event) => {
    event.preventDefault();
    const bookingId = event.dataTransfer.getData("application/x-nutreza-booking");
    const instant = zonedLocalToUtc(`${day}T${String(hour).padStart(2, "0")}:00`, timezone);
    if (!bookingId || !instant) return;
    const data = new FormData();
    data.set("inicio", instant);
    startTransition(() => { void rescheduleBooking(bookingId, data); });
  }} aria-label={`${day} às ${String(hour).padStart(2, "0")}:00`}>{children}</div>;
}
