import { z } from "zod";

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const eventSchema = z.object({
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen lang sein"),
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  eventType: z.enum(["EVENT", "WORKSHOP", "SOCIAL", "OPEN_TRAINING"]).default("EVENT"),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Ungültiges Startdatum",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Ungültiges Enddatum",
  }),
  locationName: z.string().optional(),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  
  flyer1: z.string().optional(),
  flyer2: z.string().optional(),
  
  website: z.string().url("Ungültige URL").optional().or(z.literal("")),
  ticketLink: z.string().url("Ungültige URL").optional().or(z.literal("")),
  ticketPrice: z.string().optional(),

  organizer: z.string().optional(),
  groupId: z.string().optional(),
  
  // Workshop booking fields
  maxParticipants: z.number().min(1).optional().nullable(),
  requiresRegistration: z.boolean().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  if (Number.isNaN(start.getTime())) return true;

  const min = startOfDay(new Date());
  min.setDate(min.getDate() - 30);

  return start >= min;
}, {
  message: "Startdatum darf höchstens 30 Tage in der Vergangenheit liegen",
  path: ["startDate"],
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "Das Enddatum muss nach dem Startdatum liegen",
  path: ["endDate"],
});

export type EventFormData = z.infer<typeof eventSchema>;
