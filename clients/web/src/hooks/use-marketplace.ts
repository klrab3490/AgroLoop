"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/services/marketplace.service";
import type { ProductApiResponse } from "@agroloop/api-types";

export type MarketplaceSortOption = "featured" | "price-low" | "price-high" | "stock-high";

export function useMarketplace() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>("featured");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  const {
    data: pageResult,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["marketplace-products", selectedCategory, searchKeyword],
    queryFn: () =>
      marketplaceService.listProducts({
        category: selectedCategory || undefined,
        keyword: searchKeyword || undefined,
      }),
    retry: 2,
  });

  const rawProducts: ProductApiResponse[] = pageResult?.content ?? [];

  const filteredAndSortedProducts = useMemo(() => {
    let list = [...rawProducts];

    if (inStockOnly) {
      list = list.filter((p) => (p.stock ?? 0) > 0);
    }

    if (sortBy === "price-low") {
      list.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    } else if (sortBy === "price-high") {
      list.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    } else if (sortBy === "stock-high") {
      list.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
    }

    return list;
  }, [rawProducts, inStockOnly, sortBy]);

  return {
    products: filteredAndSortedProducts,
    totalCount: pageResult?.totalElements ?? filteredAndSortedProducts.length,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    searchKeyword,
    setSearchKeyword,
    sortBy,
    setSortBy,
    inStockOnly,
    setInStockOnly,
    refetch,
  };
}
