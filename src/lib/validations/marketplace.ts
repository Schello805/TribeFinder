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

export const marketplaceListingCreateSchema = z
  .object({
    title: z.string().min(2),
    description: z.string().min(10),
    category: MarketplaceCategorySchema,
    listingType: ListingTypeSchema,
    postalCode: z.string().min(4).max(10),
    city: z.string().min(2).max(80),
    priceType: PriceTypeSchema,
    priceCents: z.number().int().nonnegative().optional().nullable(),
    currency: z.string().min(1).optional(),
    shippingAvailable: z.boolean().optional(),
    shippingCostCents: z.number().int().nonnegative().optional().nullable(),
    images: z.array(imageSchema).max(5).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.priceType === "NEGOTIABLE" && (v.priceCents === null || typeof v.priceCents !== "number")) {
      ctx.addIssue({ code: "custom", path: ["priceCents"], message: "Bei Verhandlungsbasis ist ein Preis erforderlich." });
    }

    if (v.shippingAvailable) {
      if (v.shippingCostCents === null || typeof v.shippingCostCents !== "number") {
        ctx.addIssue({ code: "custom", path: ["shippingCostCents"], message: "Bitte Versandkosten angeben." });
      }
    }
  });

export const marketplaceListingUpdateSchema = marketplaceListingCreateSchema.partial().extend({
  images: z.array(imageSchema).max(5).optional(),
});

export type MarketplaceListingCreateData = z.infer<typeof marketplaceListingCreateSchema>;
export type MarketplaceListingUpdateData = z.infer<typeof marketplaceListingUpdateSchema>;
