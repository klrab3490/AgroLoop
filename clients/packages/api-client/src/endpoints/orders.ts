import type {
  OrderApiResponse,
  CreateOrderApiRequest,
  CancelOrderApiRequest,
  DisputeOrderApiRequest,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface OrderEndpoints {
  listOrders(): Promise<OrderApiResponse[]>;
  getOrder(id: number): Promise<OrderApiResponse>;
  createOrder(request: CreateOrderApiRequest, options?: MutationOptions): Promise<OrderApiResponse>;
  create(request: CreateOrderApiRequest, options?: MutationOptions): Promise<OrderApiResponse>;
  cancelOrder(id: number, request: CancelOrderApiRequest, options?: MutationOptions): Promise<OrderApiResponse>;
  disputeOrder(id: number, request: DisputeOrderApiRequest, options?: MutationOptions): Promise<OrderApiResponse>;
  completeOrder(id: number): Promise<OrderApiResponse>;
  updateStatus(id: number, status: string): Promise<OrderApiResponse>;
}

export function createOrderEndpoints(client: AgroLoopApiClient): OrderEndpoints {
  const createOrder = async (request: CreateOrderApiRequest, options?: MutationOptions) => {
    return client.post<OrderApiResponse>("/orders", request, {
      idempotentMutation: true,
      idempotencyKey: options?.idempotencyKey,
    });
  };

  return {
    async listOrders() {
      return client.get<OrderApiResponse[]>("/orders");
    },

    async getOrder(id: number) {
      return client.get<OrderApiResponse>(`/orders/${id}`);
    },

    createOrder,
    create: createOrder,

    async cancelOrder(id: number, request: CancelOrderApiRequest, options?: MutationOptions) {
      return client.post<OrderApiResponse>(`/orders/${id}/cancel`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async disputeOrder(id: number, request: DisputeOrderApiRequest, options?: MutationOptions) {
      return client.post<OrderApiResponse>(`/orders/${id}/dispute`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    async completeOrder(id: number) {
      return client.post<OrderApiResponse>(`/orders/${id}/complete`, {});
    },

    async updateStatus(id: number, status: string) {
      return client.post<OrderApiResponse>(`/orders/${id}/status`, { status });
    },
  };
}
