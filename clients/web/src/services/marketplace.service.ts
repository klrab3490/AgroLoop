import { webApiClient } from "./api-client";
import type { ProductApiResponse, PageApiResponseProductApiResponse } from "@agroloop/api-types";

export interface ListProductsParams {
  category?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

export const marketplaceService = {
  async listProducts(params?: ListProductsParams): Promise<PageApiResponseProductApiResponse> {
    return webApiClient.marketplace.listProducts({
      category: params?.category || undefined,
      keyword: params?.keyword || undefined,
      page: params?.page,
      size: params?.size,
    });
  },

  async getProductById(id: number): Promise<ProductApiResponse> {
    return webApiClient.marketplace.getProduct(id);
  },

  async listCategories(): Promise<Record<string, string>[]> {
    return webApiClient.marketplace.listCategories();
  },
};
