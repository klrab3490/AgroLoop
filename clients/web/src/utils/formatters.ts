/**
 * Standard data and currency formatting utilities.
 */

export function formatCurrency(amount: number | string | null | undefined, currency: string = "USD"): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "$0.00";
  }
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatDate(
  dateInput: string | Date | number | null | undefined,
  includeTime: boolean = false
): string {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return "N/A";
  }
}

export function formatTokenAmount(tokens: number | string | null | undefined): string {
  if (tokens === null || tokens === undefined || isNaN(Number(tokens))) {
    return "0.00 ECO";
  }
  const numeric = typeof tokens === "string" ? parseFloat(tokens) : tokens;
  return `${numeric.toFixed(2)} ECO`;
}

export function formatWeight(weightKg: number | string | null | undefined): string {
  if (weightKg === null || weightKg === undefined || isNaN(Number(weightKg))) {
    return "0.00 kg";
  }
  const numeric = typeof weightKg === "string" ? parseFloat(weightKg) : weightKg;
  return `${numeric.toFixed(2)} kg`;
}
