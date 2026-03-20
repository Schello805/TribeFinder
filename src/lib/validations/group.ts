import { z } from "zod";
import { isValidGermanCountryName } from "@/lib/countries";

const DanceLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]);
const DanceModeSchema = z.enum(["IMPRO", "CHOREO", "BOTH"]).nullable();

const baseGroupSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  website: z.string().url("Ungültige URL").optional().or(z.literal("")),
  contactEmail: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  videoUrl: z.string().url("Ungültige URL").optional().or(z.literal("")), // Youtube Link
  size: z.enum(["SOLO", "DUO", "TRIO", "SMALL", "LARGE"]),
  
  trainingTime: z.string().optional(),
  accessories: z.string().optional(),
  performances: z.boolean().optional(),
  foundingYear: z.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
  seekingMembers: z.boolean().optional(),

  location: z
    .object({
      address: z.string().optional(),
      country: z
        .string()
        .trim()
        .min(2)
        .default("Deutschland")
        .refine((v) => isValidGermanCountryName(v), "Unbekanntes Land"),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  dialectTags: z.array(z.string()).optional(),
  propTags: z.array(z.string()).optional(),
  danceStyles: z
    .array(
      z.object({
        styleId: z.string().min(1),
        level: DanceLevelSchema.default("BEGINNER"),
        mode: DanceModeSchema.optional(),
      })
    )
    .optional(),
  image: z.string().optional(), // Für Logo/Bild Upload (Pfad)
  headerImage: z.string().optional(),
  headerImageFocusY: z.number().min(0).max(100).optional(),
  headerGradientFrom: z.string().optional(),
  headerGradientTo: z.string().optional(),
});

export const groupCreateSchema = baseGroupSchema.extend({
  location: z.object({
    address: z.string().trim().min(3, "Adresse ist erforderlich"),
    country: z
      .string()
      .trim()
      .min(2)
      .default("Deutschland")
      .refine((v) => isValidGermanCountryName(v), "Unbekanntes Land"),
    lat: z.number().refine((v) => Number.isFinite(v), "Ungültige Koordinaten"),
    lng: z.number().refine((v) => Number.isFinite(v), "Ungültige Koordinaten"),
  }),
});

export const groupUpdateSchema = baseGroupSchema;

export type GroupCreateData = z.infer<typeof groupCreateSchema>;
export type GroupFormData = z.infer<typeof groupUpdateSchema>;
