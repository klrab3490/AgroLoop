import type {
  SolvencyMetricsDto,
  PageApiResponseEcoTokenTransactionApiResponse,
  OrderApiResponse,
  CancelOrderApiRequest,
  ResolveDisputeApiRequest,
  UserApiResponse,
  TokenAdjustmentApiRequest,
  HouseholdBalanceResponse,
  FarmerApplicationApiResponse,
  ConvertUserToFarmerRequest,
  CreateUserApiRequest,
  UpdateUserRoleApiRequest,
  StorageDiagnosticsResponse,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface AdminEndpoints {
  getSolvencyMetrics(): Promise<SolvencyMetricsDto>;
  getLedger(params?: { page?: number; size?: number }): Promise<PageApiResponseEcoTokenTransactionApiResponse>;
  listOrders(params?: { status?: string }): Promise<OrderApiResponse[]>;
  cancelOrder(id: number, request: CancelOrderApiRequest, options?: MutationOptions): Promise<OrderApiResponse>;
  resolveDispute(id: number, request: ResolveDisputeApiRequest, options?: MutationOptions): Promise<OrderApiResponse>;
  listUsers(): Promise<UserApiResponse[]>;
  getUser(id: number): Promise<UserApiResponse>;
  createUser(request: CreateUserApiRequest): Promise<UserApiResponse>;
  updateUserRole(id: number, request: UpdateUserRoleApiRequest): Promise<UserApiResponse>;
  setUserStatus(id: number, enabled: boolean): Promise<UserApiResponse>;
  adjustTokens(id: number, request: TokenAdjustmentApiRequest, options?: MutationOptions): Promise<HouseholdBalanceResponse>;
  listFarmerApplications(): Promise<FarmerApplicationApiResponse[]>;
  approveFarmerApplication(id: number): Promise<{ message: string }>;
  rejectFarmerApplication(id: number, reason?: string): Promise<{ message: string }>;
  convertUserToFarmer(id: number, request: ConvertUserToFarmerRequest): Promise<UserApiResponse>;
  getStorageDiagnostics(): Promise<StorageDiagnosticsResponse>;
}

export function createAdminEndpoints(client: AgroLoopApiClient): AdminEndpoints {
  return {
    async getSolvencyMetrics() {
      return client.get<SolvencyMetricsDto>("/admin/solvency");
    },

    async getLedger(params) {
      const searchParams = new URLSearchParams();
      if (params?.page !== undefined) searchParams.set("page", params.page.toString());
      if (params?.size !== undefined) searchParams.set("size", params.size.toString());
      const qs = searchParams.toString();
      return client.get<PageApiResponseEcoTokenTransactionApiResponse>(
        `/admin/ledger${qs ? `?${qs}` : ""}`
      );
    },

    async listOrders(params) {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      const qs = searchParams.toString();
      return client.get<OrderApiResponse[]>(`/admin/orders${qs ? `?${qs}` : ""}`);
    },

    async cancelOrder(id: number, request: CancelOrderApiRequest, options?: MutationOptions) {
      return client.post<OrderApiResponse>(`/admin/orders/${id}/cancel`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async resolveDispute(id: number, request: ResolveDisputeApiRequest, options?: MutationOptions) {
      return client.post<OrderApiResponse>(`/admin/orders/${id}/dispute/resolve`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async listUsers() {
      return client.get<UserApiResponse[]>("/admin/users");
    },

    async getUser(id: number) {
      return client.get<UserApiResponse>(`/admin/users/${id}`);
    },

    async createUser(request: CreateUserApiRequest) {
      return client.post<UserApiResponse>("/admin/users", request);
    },

    async updateUserRole(id: number, request: UpdateUserRoleApiRequest) {
      return client.post<UserApiResponse>(`/admin/users/${id}/role`, request);
    },

    async setUserStatus(id: number, enabled: boolean) {
      return client.post<UserApiResponse>(`/admin/users/${id}/status`, { enabled });
    },

    async adjustTokens(id: number, request: TokenAdjustmentApiRequest, options?: MutationOptions) {
      return client.post<HouseholdBalanceResponse>(`/admin/users/${id}/token-adjustment`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async listFarmerApplications() {
      return client.get<FarmerApplicationApiResponse[]>("/admin/farmer-applications");
    },

    async approveFarmerApplication(id: number) {
      return client.post<{ message: string }>(`/admin/farmer-applications/${id}/approve`);
    },

    async rejectFarmerApplication(id: number, reason?: string) {
      return client.post<{ message: string }>(`/admin/farmer-applications/${id}/reject`, { reason });
    },

    async convertUserToFarmer(id: number, request: ConvertUserToFarmerRequest) {
      return client.post<UserApiResponse>(`/admin/users/${id}/convert-to-farmer`, request);
    },

    async getStorageDiagnostics() {
      return client.get<StorageDiagnosticsResponse>("/admin/storage/status");
    },
  };
}
