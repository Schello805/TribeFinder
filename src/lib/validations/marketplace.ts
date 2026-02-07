import { z } from "zod";

const MarketplaceCategorySchema = z.enum([
  "KOSTUEME",
  "SCHMUCK",
  "ACCESSOIRES",
  "SCHUHE",
  "SONSTIGES",
]);

const imageSchema = z.object({
  url: z.string().min(1),
  caption: z.string().optional().nullable(),
});

const ListingTypeSchema = z.enum(["OFFER", "REQUEST"]);
const PriceTypeSchema = z.enum(["FIXED", "NEGOTIABLE"]);

const marketplaceListingBaseSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  category: MarketplaceCategorySchema,
  listingType: ListingTypeSchema,
  postalCode: z.string().regex(/^\d{5}$/, "Bitte eine gültige PLZ (5 Ziffern) angeben."),
  city: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[\p{L}][\p{L}\s\-.'’]*$/u, "Bitte einen gültigen Ort angeben."),
  priceType: PriceTypeSchema,
  priceCents: z.number().int().nonnegative().nullable(),
  currency: z.string().min(1).optional(),
  shippingAvailable: z.boolean().optional(),
  shippingCostCents: z.number().int().nonnegative().optional().nullable(),
  images: z.array(imageSchema).max(5).optional(),
});

export const marketplaceListingCreateSchema = marketplaceListingBaseSchema.superRefine((v, ctx) => {
  if (v.listingType === "OFFER") {
    if (v.priceCents === null || typeof v.priceCents !== "number") {
      ctx.addIssue({ code: "custom", path: ["priceCents"], message: "Bitte einen gültigen Preis angeben." });
    }
  }

  if (v.shippingAvailable) {
    if (v.shippingCostCents === null || typeof v.shippingCostCents !== "number") {
      ctx.addIssue({ code: "custom", path: ["shippingCostCents"], message: "Bitte Versandkosten angeben." });
    }
  }
});

export const marketplaceListingUpdateSchema = marketplaceListingBaseSchema
  .partial()
  .extend({
    priceCents: z.number().int().nonnegative().nullable().optional(),
  })
  .extend({
    images: z.array(imageSchema).max(5).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.listingType === "OFFER") {
      if (v.priceCents === null || typeof v.priceCents !== "number") {
        ctx.addIssue({ code: "custom", path: ["priceCents"], message: "Bitte einen gültigen Preis angeben." });
      }
    }

    if (v.shippingAvailable === true) {
      if (typeof v.shippingCostCents !== "number") {
        ctx.addIssue({ code: "custom", path: ["shippingCostCents"], message: "Bitte Versandkosten angeben." });
      }
    }
  });

export type MarketplaceListingCreateData = z.infer<typeof marketplaceListingCreateSchema>;
export type MarketplaceListingUpdateData = z.infer<typeof marketplaceListingUpdateSchema>;
