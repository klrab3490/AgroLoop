"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersService } from "@/services/orders.service";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "./use-toast";
import { getErrorMessage } from "@/utils/error-handler";

export function useOrders() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-orders"],
    queryFn: () => ordersService.listOrders(),
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => ordersService.cancelOrder(orderId),
    onSuccess: () => {
      success("Order cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
    },
    onError: (err) => {
      toastError(getErrorMessage(err, "Failed to cancel order"));
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) =>
      ordersService.disputeOrder(orderId, reason),
    onSuccess: () => {
      success("Dispute submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
    },
    onError: (err) => {
      toastError(getErrorMessage(err, "Failed to submit dispute"));
    },
  });

  return {
    orders,
    isLoading,
    error,
    refetch,
    cancelOrder: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
    disputeOrder: disputeMutation.mutate,
    isDisputing: disputeMutation.isPending,
  };
}
