import { webApiClient } from "./api-client";
import type {
  PickupRequestApiResponse,
  VerifyPickupHandshakeApiRequest,
  PickupHandshakeResultApiResponse,
  PickupHandshakePassResponse,
} from "@agroloop/api-types";

export const pickupsService = {
  async listPickups(): Promise<PickupRequestApiResponse[]> {
    return webApiClient.pickups.listPickups();
  },

  async getPickupById(id: number): Promise<PickupRequestApiResponse> {
    return webApiClient.pickups.getPickup(id);
  },

  async generateHandshakePass(pickupId: number): Promise<PickupHandshakePassResponse> {
    return webApiClient.pickups.generateHandshakePass(pickupId);
  },

  async verifyPickupHandshake(
    pickupId: number,
    request: VerifyPickupHandshakeApiRequest
  ): Promise<PickupHandshakeResultApiResponse> {
    return webApiClient.pickups.verifyHandshake(pickupId, request);
  },
};
