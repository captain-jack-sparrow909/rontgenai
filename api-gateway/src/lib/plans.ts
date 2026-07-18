export type PlanId = "free" | "pro" | "team";

export type ProductId =
  | "blueprint"
  | "pulse"
  | "atlas"
  | "sentinel"
  | "forge"
  | "radar"
  | "relay";

/** Monthly unit limits. 0 = not available on plan. -1 = unlimited. */
export const PLAN_LIMITS: Record<PlanId, Record<ProductId, number>> = {
  free: {
    blueprint: 3,
    pulse: 20,
    atlas: 2,
    sentinel: 0,
    forge: 0,
    radar: 2,
    relay: 1,
  },
  pro: {
    blueprint: 50,
    pulse: 500,
    atlas: 20,
    sentinel: 50,
    forge: 5,
    radar: 30,
    relay: 20,
  },
  team: {
    blueprint: 200,
    pulse: 2000,
    atlas: -1,
    sentinel: 300,
    forge: 30,
    radar: 100,
    relay: 100,
  },
};

export const PLAN_SEATS: Record<PlanId, number> = {
  free: 1,
  pro: 1,
  team: 5,
};

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export function canUseProduct(plan: PlanId, product: ProductId): boolean {
  return PLAN_LIMITS[plan][product] !== 0;
}
