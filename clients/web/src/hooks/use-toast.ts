"use client";

import { useToastContext, ToastType } from "../context/toast-context";

export function useToast() {
  const { showToast, removeToast } = useToastContext();

  return {
    toast: showToast,
    success: (message: string, duration?: number) => showToast(message, "success", duration),
    error: (message: string, duration?: number) => showToast(message, "error", duration),
    warning: (message: string, duration?: number) => showToast(message, "warning", duration),
    info: (message: string, duration?: number) => showToast(message, "info", duration),
    dismiss: removeToast,
  };
}
