// lib/schemas.js
import { z } from "zod";

export const CustomerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a valid phone"),
  state: z.string().min(1, "State is required"),
  postcode: z.string().min(3, "Postcode is required"),
});

export const ItemSchema = z.object({
  variantId: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(v => Number(v)),
});

export const PayloadSchema = z.object({
  vehicleId: z.string().nullable().optional(),
  items: z.array(ItemSchema).min(1, "Select at least one item"),
  selections: z.record(z.array(z.string())).optional(),
  customer: CustomerSchema,
});

// Helper to safely parse JSON fields from FormData
export function parseJsonField(fd, name, fallback) {
  const raw = fd.get(name);
  if (!raw) return fallback;
  try { return JSON.parse(String(raw)); } catch { return fallback; }
}
