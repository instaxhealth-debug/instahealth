export interface ShippingAddressSource {
  line1?: string | null;
  line2?: string | null;
  area?: string | null;
  city?: string | null;
  emirate?: string | null;
  formattedAddress?: string | null;
}

export interface ShippingPayloadInput {
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  selectedAddress?: ShippingAddressSource | null;
}

export interface ShippingPayload {
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingArea?: string | null;
  shippingEmirate?: string | null;
}

function normalizePhoneUAE(input: string): string {
  const cleaned = input.replace(/\s+/g, "").trim();
  if (!cleaned) return cleaned;
  if (cleaned.startsWith("+971")) return cleaned;
  if (cleaned.startsWith("0")) return "+971" + cleaned.slice(1);
  return cleaned;
}

export function buildShippingPayload(input: ShippingPayloadInput): ShippingPayload {
  const selected = input.selectedAddress;
  const line1 =
    (selected?.line1 || "") ||
    (selected?.formattedAddress || "") ||
    input.shippingAddressLine1 ||
    "";
  const line2 = selected?.line2 || input.shippingAddressLine2 || "";

  return {
    shippingName: input.shippingName.trim(),
    shippingPhone: normalizePhoneUAE(input.shippingPhone),
    shippingAddressLine1: line1.trim(),
    shippingAddressLine2: line2.trim(),
    shippingArea: selected?.area || null,
    shippingEmirate: selected?.emirate || null,
  };
}
