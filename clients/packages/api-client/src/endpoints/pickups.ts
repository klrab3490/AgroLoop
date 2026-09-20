import type {
  PickupRequestApiResponse,
  CancelOrderApiRequest,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface PickupEndpoints {
  listPickups(): Promise<PickupRequestApiResponse[]>;
  getPickup(id: number): Promise<PickupRequestApiResponse>;
  cancelPickup(id: number, request: CancelOrderApiRequest, options?: MutationOptions): Promise<PickupRequestApiResponse>;
}

export function createPickupEndpoints(client: AgroLoopApiClient): PickupEndpoints {
  return {
    async listPickups() {
      return client.get<PickupRequestApiResponse[]>("/pickups");
    },

    async getPickup(id: number) {
      return client.get<PickupRequestApiResponse>(`/pickups/${id}`);
    },

    async cancelPickup(id: number, request: CancelOrderApiRequest, options?: MutationOptions) {
      return client.post<PickupRequestApiResponse>(`/pickups/${id}/cancel`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },
  };
}
