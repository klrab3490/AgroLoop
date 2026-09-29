import { AgroLoopApiClient, type ApiClientConfig } from "./client.js";
import { createAuthEndpoints, type AuthEndpoints } from "./endpoints/auth.js";
import { createMarketplaceEndpoints, type MarketplaceEndpoints } from "./endpoints/marketplace.js";
import { createOrderEndpoints, type OrderEndpoints } from "./endpoints/orders.js";
import { createHouseholdEndpoints, type HouseholdEndpoints } from "./endpoints/household.js";
import { createPickupEndpoints, type PickupEndpoints } from "./endpoints/pickups.js";
import { createFarmerEndpoints, type FarmerEndpoints } from "./endpoints/farmer.js";
import { createAdminEndpoints, type AdminEndpoints } from "./endpoints/admin.js";
import { createMediaEndpoints, type MediaEndpoints } from "./endpoints/media.js";

export * from "./client.js";
export * from "./errors.js";
export * from "./request-id.js";
export * from "./idempotency.js";
export * from "./auth/token-storage.js";
export * from "./auth/session.js";
export * from "./auth/refresh.js";
export * from "./server-verification.js";
export * from "./formatters.js";
export * from "./version-checker.js";

export type {
  AuthEndpoints,
  MarketplaceEndpoints,
  OrderEndpoints,
  HouseholdEndpoints,
  PickupEndpoints,
  FarmerEndpoints,
  AdminEndpoints,
  MediaEndpoints,
};

export interface AgroLoopClient extends AgroLoopApiClient {
  auth: AuthEndpoints;
  marketplace: MarketplaceEndpoints;
  orders: OrderEndpoints;
  household: HouseholdEndpoints;
  pickups: PickupEndpoints;
  farmer: FarmerEndpoints;
  admin: AdminEndpoints;
  media: MediaEndpoints;
}

/**
 * Factory function creating a fully configured, type-safe AgroLoop API client.
 */
export function createAgroLoopClient(config: ApiClientConfig): AgroLoopClient {
  const baseClient = new AgroLoopApiClient(config);

  const client = baseClient as AgroLoopClient;
  client.auth = createAuthEndpoints(baseClient);
  client.marketplace = createMarketplaceEndpoints(baseClient);
  client.orders = createOrderEndpoints(baseClient);
  client.household = createHouseholdEndpoints(baseClient);
  client.pickups = createPickupEndpoints(baseClient);
  client.farmer = createFarmerEndpoints(baseClient);
  client.admin = createAdminEndpoints(baseClient);
  client.media = createMediaEndpoints(baseClient);

  return client;
}
