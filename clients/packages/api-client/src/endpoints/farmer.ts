import type {
  PickupRequestApiResponse,
  SchedulePickupApiRequest,
  VerifyWasteApiRequest,
  ProductApiResponse,
  FarmerProductApiRequest,
  OrderApiResponse,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface FarmerEndpoints {
  getAvailablePickups(): Promise<PickupRequestApiResponse[]>;
  claimPickup(id: number, options?: MutationOptions): Promise<PickupRequestApiResponse>;
  schedulePickup(id: number, request: SchedulePickupApiRequest, options?: MutationOptions): Promise<PickupRequestApiResponse>;
  collectPickup(id: number, options?: MutationOptions): Promise<PickupRequestApiResponse>;
  verifyPickup(id: number, request: VerifyWasteApiRequest, options?: MutationOptions): Promise<PickupRequestApiResponse>;
  getProducts(): Promise<ProductApiResponse[]>;
  createProduct(request: FarmerProductApiRequest, options?: MutationOptions): Promise<ProductApiResponse>;
  updateProduct(id: number, request: FarmerProductApiRequest): Promise<ProductApiResponse>;
  getOrders(): Promise<OrderApiResponse[]>;
  getActiveRoutes(): Promise<import("@agroloop/api-types").CollectionRouteApiResponse[]>;
  getRouteDetails(id: number): Promise<import("@agroloop/api-types").CollectionRouteApiResponse>;
  createOptimizedRoute(request: import("@agroloop/api-types").CreateRouteApiRequest): Promise<import("@agroloop/api-types").CollectionRouteApiResponse>;
  startRoute(id: number): Promise<import("@agroloop/api-types").CollectionRouteApiResponse>;
  completeStop(id: number, stopId: number): Promise<void>;
  cancelRoute(id: number, reason?: string): Promise<void>;
  updateLocation(request: import("@agroloop/api-types").UpdateFarmerLocationApiRequest): Promise<void>;
}

export function createFarmerEndpoints(client: AgroLoopApiClient): FarmerEndpoints {
  return {
    async getAvailablePickups() {
      return client.get<PickupRequestApiResponse[]>("/farmer/pickups/available");
    },

    async claimPickup(id: number, options?: MutationOptions) {
      return client.post<PickupRequestApiResponse>(`/farmer/pickups/${id}/claim`, undefined, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async schedulePickup(id: number, request: SchedulePickupApiRequest, options?: MutationOptions) {
      return client.post<PickupRequestApiResponse>(`/farmer/pickups/${id}/schedule`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async collectPickup(id: number, options?: MutationOptions) {
      return client.post<PickupRequestApiResponse>(`/farmer/pickups/${id}/collect`, undefined, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async verifyPickup(id: number, request: VerifyWasteApiRequest, options?: MutationOptions) {
      return client.post<PickupRequestApiResponse>(`/farmer/pickups/${id}/verify`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async getProducts() {
      return client.get<ProductApiResponse[]>("/farmer/products");
    },

    async createProduct(request: FarmerProductApiRequest, options?: MutationOptions) {
      return client.post<ProductApiResponse>("/farmer/products", request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async updateProduct(id: number, request: FarmerProductApiRequest) {
      return client.put<ProductApiResponse>(`/farmer/products/${id}`, request);
    },

    async getOrders() {
      return client.get<OrderApiResponse[]>("/farmer/orders");
    },

    async getActiveRoutes() {
      return client.get<import("@agroloop/api-types").CollectionRouteApiResponse[]>("/farmer/routes/active");
    },

    async getRouteDetails(id: number) {
      return client.get<import("@agroloop/api-types").CollectionRouteApiResponse>(`/farmer/routes/${id}`);
    },

    async createOptimizedRoute(request: import("@agroloop/api-types").CreateRouteApiRequest) {
      return client.post<import("@agroloop/api-types").CollectionRouteApiResponse>("/farmer/routes/optimize", request);
    },

    async startRoute(id: number) {
      return client.post<import("@agroloop/api-types").CollectionRouteApiResponse>(`/farmer/routes/${id}/start`, undefined);
    },

    async completeStop(id: number, stopId: number) {
      return client.post<void>(`/farmer/routes/${id}/stops/${stopId}/complete`, undefined);
    },

    async cancelRoute(id: number, reason?: string) {
      return client.post<void>(`/farmer/routes/${id}/cancel${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`, undefined);
    },

    async updateLocation(request: import("@agroloop/api-types").UpdateFarmerLocationApiRequest) {
      return client.put<void>("/farmer/location", request);
    },
  };
}
