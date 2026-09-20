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
  };
}
