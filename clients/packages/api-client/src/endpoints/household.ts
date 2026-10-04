import type {
  HouseholdBalanceResponse,
  EcoTokenTransactionApiResponse,
  WasteSubmissionApiResponse,
  WasteSubmissionApiRequest,
  SubmitFarmerApplicationRequest,
  FarmerApplicationApiResponse,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface HouseholdEndpoints {
  getBalance(): Promise<HouseholdBalanceResponse>;
  getLedger(): Promise<EcoTokenTransactionApiResponse[]>;
  getSubmissions(): Promise<WasteSubmissionApiResponse[]>;
  submitWaste(request: WasteSubmissionApiRequest, options?: MutationOptions): Promise<WasteSubmissionApiResponse>;
  submitFarmerApplication(request: SubmitFarmerApplicationRequest): Promise<FarmerApplicationApiResponse>;
  getFarmerApplication(): Promise<FarmerApplicationApiResponse | null>;
}

export function createHouseholdEndpoints(client: AgroLoopApiClient): HouseholdEndpoints {
  return {
    async getBalance() {
      return client.get<HouseholdBalanceResponse>("/household/balance");
    },

    async getLedger() {
      return client.get<EcoTokenTransactionApiResponse[]>("/household/ledger");
    },

    async getSubmissions() {
      return client.get<WasteSubmissionApiResponse[]>("/household/waste-submissions");
    },

    async submitWaste(request: WasteSubmissionApiRequest, options?: MutationOptions) {
      return client.post<WasteSubmissionApiResponse>("/household/waste-submissions", request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async submitFarmerApplication(request: SubmitFarmerApplicationRequest) {
      return client.post<FarmerApplicationApiResponse>("/household/farmer-application", request);
    },

    async getFarmerApplication() {
      try {
        return await client.get<FarmerApplicationApiResponse>("/household/farmer-application");
      } catch {
        return null;
      }
    },
  };
}
