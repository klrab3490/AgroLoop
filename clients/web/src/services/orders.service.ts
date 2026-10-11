import { webApiClient } from "./api-client";
import type { OrderApiResponse, CreateOrderApiRequest } from "@agroloop/api-types";

export const ordersService = {
  async listOrders(): Promise<OrderApiResponse[]> {
    return webApiClient.orders.listOrders();
  },

  async getOrderById(id: number): Promise<OrderApiResponse> {
    return webApiClient.orders.getOrder(id);
  },

  async createOrder(payload: CreateOrderApiRequest): Promise<OrderApiResponse> {
    return webApiClient.orders.createOrder(payload);
  },

  async cancelOrder(id: number, reason: string = "User requested cancellation"): Promise<OrderApiResponse> {
    return webApiClient.orders.cancelOrder(id, { reason });
  },

  async disputeOrder(id: number, disputeReason: string): Promise<OrderApiResponse> {
    return webApiClient.orders.disputeOrder(id, { disputeReason });
  },
};
