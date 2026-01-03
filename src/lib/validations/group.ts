import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  website: z.string().url("Ungültige URL").optional().or(z.literal("")),
  contactEmail: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  videoUrl: z.string().url("Ungültige URL").optional().or(z.literal("")), // Youtube Link
  size: z.enum(["SOLO", "DUO", "TRIO", "SMALL", "LARGE"]),
  
  trainingTime: z.string().optional(),
  performances: z.boolean().optional(),
  foundingYear: z.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
  seekingMembers: z.boolean().optional(),

  location: z.object({
    address: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  image: z.string().optional(), // Für Logo/Bild Upload (Pfad)
});

export type GroupFormData = z.infer<typeof groupSchema>;
