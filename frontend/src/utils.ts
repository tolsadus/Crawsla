import type { Listing } from "./types";

export type Drivetrain = "RWD" | "AWD" | "Performance" | "Plaid";

export function getDrivetrain(listing: Listing): Drivetrain | null {
  const hay = `${listing.title ?? ""} ${listing.version ?? ""}`.toLowerCase();

  if (/plaid/i.test(hay)) return "Plaid";

  if (/performance|pup\b|p\d+d\b/i.test(hay)) return "Performance";

  if (
    /\bawd\b|dual.motor|grande.autonomie|long.?range|transmission.int[eé]grale|long-range/i.test(hay)
  )
    return "AWD";

  if (
    /\brwd\b|propulsion|standard.?plus|standard.?range|standard\b|single.motor/i.test(hay)
  )
    return "RWD";

  return null;
}

export function formatFuel(fuel: string | null, t: (k: any) => string): string {
  if (!fuel) return "—";
  const n = fuel.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/electr/i.test(n)) return t("fuel_electric");
  if (/hybrid/i.test(n)) return t("fuel_hybrid");
  return fuel;
}

export function formatColor(color: string | null): string | null {
  if (!color) return null;
  return color.replace(/^coloris\s+/i, "").trim();
}

export const DRIVETRAIN_LABEL: Record<Drivetrain, string> = {
  RWD: "RWD",
  AWD: "AWD",
  Performance: "Perf",
  Plaid: "Plaid",
};
