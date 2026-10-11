"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/services/marketplace.service";
import { useAuth } from "@/lib/auth-context";
import type { ProductApiResponse } from "@agroloop/api-types";

export type MarketplaceSortOption = "featured" | "price-low" | "price-high" | "stock-high";

export function useMarketplace() {
  const { user } = useAuth();
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

    // If logged in as a farmer, filter out farmer's own products so they are not rendered for self-purchasing
    if (user && user.role === "ROLE_FARMER") {
      const farmerId = user.id;
      const farmerName = user.name?.trim().toLowerCase();
      const farmName = user.farmName?.trim().toLowerCase();

      list = list.filter((p) => {
        if (farmerId != null && p.farmerId != null && p.farmerId === farmerId) {
          return false;
        }
        if (farmerName && p.farmerName && p.farmerName.trim().toLowerCase() === farmerName) {
          return false;
        }
        if (farmName && p.farmerName && p.farmerName.trim().toLowerCase() === farmName) {
          return false;
        }
        return true;
      });
    }

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
  }, [rawProducts, inStockOnly, sortBy, user]);

  const farmerHiddenCount =
    user?.role === "ROLE_FARMER"
      ? rawProducts.length -
        rawProducts.filter((p) => {
          if (user.id != null && p.farmerId != null && p.farmerId === user.id) return false;
          if (user.name && p.farmerName && p.farmerName.trim().toLowerCase() === user.name.trim().toLowerCase()) return false;
          if (user.farmName && p.farmerName && p.farmerName.trim().toLowerCase() === user.farmName.trim().toLowerCase()) return false;
          return true;
        }).length
      : 0;

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
    isFarmer: user?.role === "ROLE_FARMER",
    farmerHiddenCount,
  };
}
