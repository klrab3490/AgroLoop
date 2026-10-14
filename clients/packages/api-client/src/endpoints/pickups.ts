import type {
  PickupRequestApiResponse,
  CancelOrderApiRequest,
  PickupHandshakePassResponse,
  VerifyPickupHandshakeApiRequest,
  PickupHandshakeResultApiResponse,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface PickupEndpoints {
  listPickups(): Promise<PickupRequestApiResponse[]>;
  getPickup(id: number): Promise<PickupRequestApiResponse>;
  cancelPickup(id: number, request: CancelOrderApiRequest, options?: MutationOptions): Promise<PickupRequestApiResponse>;
  generateHandshakePass(pickupId: number): Promise<PickupHandshakePassResponse>;
  verifyHandshake(pickupId: number, request: VerifyPickupHandshakeApiRequest): Promise<PickupHandshakeResultApiResponse>;
  collectPickup(id: number, options?: MutationOptions): Promise<PickupRequestApiResponse>;
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

    async generateHandshakePass(pickupId: number) {
      return client.post<PickupHandshakePassResponse>(`/pickups/${pickupId}/handshake/pass`, {});
    },

    async verifyHandshake(pickupId: number, request: VerifyPickupHandshakeApiRequest) {
      return client.post<PickupHandshakeResultApiResponse>(`/pickups/${pickupId}/handshake`, request);
    },

    async collectPickup(id: number, options?: MutationOptions) {
      return client.post<PickupRequestApiResponse>(`/pickups/${id}/collect`, undefined, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },
  };
}
