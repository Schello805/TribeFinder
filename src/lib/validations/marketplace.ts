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

export const marketplaceListingCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  category: MarketplaceCategorySchema,
  priceCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().min(1).optional(),
  images: z.array(imageSchema).max(5).optional(),
});

export const marketplaceListingUpdateSchema = marketplaceListingCreateSchema.partial().extend({
  images: z.array(imageSchema).max(5).optional(),
});

export type MarketplaceListingCreateData = z.infer<typeof marketplaceListingCreateSchema>;
export type MarketplaceListingUpdateData = z.infer<typeof marketplaceListingUpdateSchema>;
