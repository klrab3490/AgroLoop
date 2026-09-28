/**
 * Formats system role identifiers (e.g. ROLE_FARMER, ROLE_HOUSEHOLD, ROLE_ADMIN)
 * into clean, user-facing display titles ("Farmer", "Household", "Admin").
 */
export function formatRole(role?: string | null): string {
  if (!role) return "";
  switch (role) {
    case "ROLE_FARMER":
    case "FARMER":
      return "Farmer";
    case "ROLE_HOUSEHOLD":
    case "HOUSEHOLD":
      return "Household";
    case "ROLE_ADMIN":
    case "ADMIN":
      return "Admin";
    default: {
      const clean = role.replace(/^ROLE_/, "");
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }
  }
}
