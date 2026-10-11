/**
 * Global site configuration and navigation hierarchy.
 */

export interface NavItem {
  title: string;
  href: string;
  badge?: string;
  role?: "HOUSEHOLD" | "FARMER" | "ADMIN" | "ALL";
}

export const siteConfig = {
  name: "AgroLoop",
  description: "Circular Economy & Regenerative Agriculture Platform",
  version: "1.0.6",
  links: {
    github: "https://github.com/rahul-ab/agroloop",
  },
  nav: {
    main: [
      { title: "Marketplace", href: "/marketplace", role: "ALL" },
      { title: "Household Portal", href: "/household", role: "HOUSEHOLD" },
      { title: "Farmer Operations", href: "/farmer", role: "FARMER" },
      { title: "My Orders", href: "/orders", role: "ALL" },
    ] as NavItem[],
  },
} as const;
