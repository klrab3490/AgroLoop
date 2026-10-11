/**
 * Authoritative TypeScript contract projections generated from AgroLoop OpenAPI 3.1 schema.
 */
export type * from "./generated/schema.js";

import type { components, paths, operations } from "./generated/schema.js";

export type Schemas = components["schemas"];

// Core Identity & Auth DTOs
export type UserApiResponse = Schemas["UserApiResponse"] & {
  tokenBalance?: number | null;
  createdAt?: string | null;
  address?: string | null;
  farmName?: string | null;
  farmAddress?: string | null;
  notes?: string | null;
  serviceRadiusKm?: number | null;
  maxDailyCapacityKg?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
};
export type LoginApiRequest = Schemas["LoginApiRequest"];
export type RegisterApiRequest = Schemas["RegisterApiRequest"];
export type RefreshTokenApiRequest = Schemas["RefreshTokenApiRequest"];

export interface CreateUserApiRequest {
  name: string;
  email: string;
  password?: string;
  role: "ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN";
  address?: string;
  farmName?: string;
  farmAddress?: string;
  notes?: string;
  initialTokens?: number;
}

export interface UpdateUserRoleApiRequest {
  role: "ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN";
  address?: string;
  farmName?: string;
  farmAddress?: string;
  notes?: string;
}

export interface SubmitFarmerApplicationRequest {
  farmName: string;
  farmAddress: string;
  notes?: string | null;
}

export interface StorageDiagnosticsResponse {
  activeProvider: string;
  targetLocation: string;
  healthy: boolean;
  message?: string;
}

export interface FarmerApplicationApiResponse {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  farmName: string;
  farmAddress: string;
  notes?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface ConvertUserToFarmerRequest {
  farmName: string;
  farmAddress: string;
  notes?: string | null;
}

export interface UserStatusApiRequest {
  enabled: boolean;
}

// Marketplace & Products DTOs
export type ProductApiResponse = Schemas["ProductApiResponse"];
export type FarmerProductApiRequest = Schemas["FarmerProductApiRequest"];
export type PageApiResponseProductApiResponse = Schemas["PageApiResponseProductApiResponse"];

// Orders & Lifecycle DTOs
export type OrderApiResponse = Omit<Schemas["OrderApiResponse"], "status"> & {
  status?: "PLACED" | "PACKED" | "IN_TRANSIT" | "COMPLETED" | "DISPUTED" | "CANCELLED" | string;
};
export type OrderItemApiResponse = Schemas["OrderItemApiResponse"];
export type CreateOrderApiRequest = Schemas["CreateOrderApiRequest"];
export type OrderItemRequest = Schemas["OrderItemRequest"];
export type CancelOrderApiRequest = Schemas["CancelOrderApiRequest"];
export type DisputeOrderApiRequest = Schemas["DisputeOrderApiRequest"];
export type ResolveDisputeApiRequest = Schemas["ResolveDisputeApiRequest"];

// Waste & Verification DTOs
export type WasteSubmissionApiResponse = Schemas["WasteSubmissionApiResponse"];
export type WasteSubmissionApiRequest = Schemas["WasteSubmissionApiRequest"] & {
  latitude?: number | null;
  longitude?: number | null;
};
export type PickupRequestApiResponse = Schemas["PickupRequestApiResponse"] & {
  handshakeVerified?: boolean;
  latestHandshakeId?: number | null;
  category?: string | null;
  estimatedWeight?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  householdEmail?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};
export type VerificationApiResponse = Schemas["VerificationApiResponse"];
export type SchedulePickupApiRequest = Schemas["SchedulePickupApiRequest"];
export type VerifyWasteApiRequest = Schemas["VerifyWasteApiRequest"];

// Logistics & Route Planning DTOs
export interface RouteStopApiResponse {
  id: number;
  pickupId: number | null;
  stopOrder: number;
  status: string;
  estimatedDistanceFromPrevKm?: number | null;
  completedAt?: string | null;
  notes?: string | null;
  category?: string | null;
  pickupAddress?: string | null;
  estimatedWeight?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  householdName?: string | null;
  householdEmail?: string | null;
}

export interface CollectionRouteApiResponse {
  id: number;
  farmerId: number | null;
  routeDate: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  totalDistanceKm: number;
  totalEstimatedWeightKg: number;
  notes?: string | null;
  stops: RouteStopApiResponse[];
  createdAt: string;
  updatedAt: string;
  farmerLatitude?: number | null;
  farmerLongitude?: number | null;
  farmerAddress?: string | null;
}

export interface CreateRouteApiRequest {
  pickupIds: number[];
  routeDate: string;
  notes?: string;
}

export interface UpdateFarmerLocationApiRequest {
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  maxDailyCapacityKg: number;
}

// Physical On-Site Pickup Handshake DTOs
export interface CompactQrPayload {
  t: string;
  v: number;
  p: number;
  h: number;
  s?: number;
  iat: number;
  exp: number;
  n: string;
  c: string;
  sig: string;
}

export interface PickupHandshakePassResponse {
  type: string;
  version: number;
  pickupId: number;
  householdId: number;
  submissionId?: number;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  passCode: string;
  signature: string;
  compactQr: CompactQrPayload;
}

export type VerifyPickupHandshakeApiRequest =
  | {
      method: "QR_SCAN";
      payload: CompactQrPayload;
      passCode?: undefined;
    }
  | {
      method: "MANUAL_PASSCODE";
      passCode: string;
      payload?: undefined;
    };

export interface PickupHandshakeResultApiResponse {
  verified: boolean;
  handshakeId: number;
  pickupId: number;
  householdId: number;
  farmerId: number;
  method: "QR_SCAN" | "MANUAL_PASSCODE";
  verifiedAt: string;
}

// Tokens, Solvency & Ledger DTOs
export type HouseholdBalanceResponse = Schemas["HouseholdBalanceResponse"];
export type EcoTokenTransactionApiResponse = Schemas["EcoTokenTransactionApiResponse"];
export type SolvencyMetricsDto = Schemas["SolvencyMetricsDto"];
export type TokenAdjustmentApiRequest = Schemas["TokenAdjustmentApiRequest"];
export type PageApiResponseEcoTokenTransactionApiResponse = Schemas["PageApiResponseEcoTokenTransactionApiResponse"];

// Media Management DTOs
export type MediaAssetApiResponse = Schemas["MediaAssetApiResponse"];
export type UploadTicketApiResponse = Schemas["UploadTicketApiResponse"];
export type UploadTicketApiRequest = Schemas["UploadTicketApiRequest"];
export type ConfirmMediaApiRequest = Schemas["ConfirmMediaApiRequest"];

// Standard RFC 7807 Problem Details
export interface ProblemDetailResponse {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
  fieldErrors?: Record<string, string>;
}
