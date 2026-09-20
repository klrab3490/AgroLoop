/**
 * Authoritative TypeScript contract projections generated from AgroLoop OpenAPI 3.1 schema.
 */
export type * from "./generated/schema.js";

import type { components, paths, operations } from "./generated/schema.js";

export type Schemas = components["schemas"];

// Core Identity & Auth DTOs
export type UserApiResponse = Schemas["UserApiResponse"];
export type LoginApiRequest = Schemas["LoginApiRequest"];
export type RegisterApiRequest = Schemas["RegisterApiRequest"];
export type RefreshTokenApiRequest = Schemas["RefreshTokenApiRequest"];

// Marketplace & Products DTOs
export type ProductApiResponse = Schemas["ProductApiResponse"];
export type FarmerProductApiRequest = Schemas["FarmerProductApiRequest"];
export type PageApiResponseProductApiResponse = Schemas["PageApiResponseProductApiResponse"];

// Orders & Lifecycle DTOs
export type OrderApiResponse = Schemas["OrderApiResponse"];
export type OrderItemApiResponse = Schemas["OrderItemApiResponse"];
export type CreateOrderApiRequest = Schemas["CreateOrderApiRequest"];
export type OrderItemRequest = Schemas["OrderItemRequest"];
export type CancelOrderApiRequest = Schemas["CancelOrderApiRequest"];
export type DisputeOrderApiRequest = Schemas["DisputeOrderApiRequest"];
export type ResolveDisputeApiRequest = Schemas["ResolveDisputeApiRequest"];

// Waste & Verification DTOs
export type WasteSubmissionApiResponse = Schemas["WasteSubmissionApiResponse"];
export type WasteSubmissionApiRequest = Schemas["WasteSubmissionApiRequest"];
export type PickupRequestApiResponse = Schemas["PickupRequestApiResponse"];
export type VerificationApiResponse = Schemas["VerificationApiResponse"];
export type SchedulePickupApiRequest = Schemas["SchedulePickupApiRequest"];
export type VerifyWasteApiRequest = Schemas["VerifyWasteApiRequest"];

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
