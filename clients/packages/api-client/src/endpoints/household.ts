import type {
  HouseholdBalanceResponse,
  EcoTokenTransactionApiResponse,
  WasteSubmissionApiResponse,
  WasteSubmissionApiRequest,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface HouseholdEndpoints {
  getBalance(): Promise<HouseholdBalanceResponse>;
  getLedger(): Promise<EcoTokenTransactionApiResponse[]>;
  getSubmissions(): Promise<WasteSubmissionApiResponse[]>;
  submitWaste(request: WasteSubmissionApiRequest, options?: MutationOptions): Promise<WasteSubmissionApiResponse>;
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
  };
}
