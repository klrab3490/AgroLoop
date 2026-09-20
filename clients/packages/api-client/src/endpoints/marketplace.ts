import type {
  ProductApiResponse,
  PageApiResponseProductApiResponse,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";

export interface MarketplaceEndpoints {
  listProducts(params?: {
    category?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }): Promise<PageApiResponseProductApiResponse>;
  getProduct(id: number): Promise<ProductApiResponse>;
  listCategories(): Promise<Array<Record<string, string>>>;
}

export function createMarketplaceEndpoints(client: AgroLoopApiClient): MarketplaceEndpoints {
  return {
    async listProducts(params) {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set("category", params.category);
      if (params?.keyword) searchParams.set("keyword", params.keyword);
      if (params?.page !== undefined) searchParams.set("page", params.page.toString());
      if (params?.size !== undefined) searchParams.set("size", params.size.toString());

      const qs = searchParams.toString();
      return client.get<PageApiResponseProductApiResponse>(
        `/marketplace/products${qs ? `?${qs}` : ""}`,
        { skipAuth: true }
      );
    },

    async getProduct(id: number) {
      return client.get<ProductApiResponse>(`/marketplace/products/${id}`, { skipAuth: true });
    },

    async listCategories() {
      return client.get<Array<Record<string, string>>>("/marketplace/categories", { skipAuth: true });
    },
  };
}
