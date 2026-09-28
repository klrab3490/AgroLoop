import { mobileApiClient, getMobileServerUrl } from "../lib/api";
import type { MediaAssetApiResponse } from "@agroloop/api-types";

export interface MediaUploadOptions {
  filename?: string;
  contentType: string;
  data: Blob | ArrayBuffer | Uint8Array;
  sizeBytes?: number;
  checksum?: string;
  purpose?: "WASTE_SUBMISSION" | "PICKUP_VERIFICATION" | "PRODUCT_IMAGE" | "USER_AVATAR";
  idempotencyKey?: string;
  onProgress?: (step: "REQUESTING_TICKET" | "UPLOADING_BYTES" | "CONFIRMING") => void;
}

/**
 * Executes the complete 3-phase media ticket lifecycle:
 * Phase 1: Request upload ticket from backend (/media/upload-ticket)
 * Phase 2: Direct binary PUT to the designated uploadUrl
 * Phase 3: Idempotent confirmation (/media/{mediaId}/confirm)
 */
export async function uploadMediaAsset(options: MediaUploadOptions): Promise<MediaAssetApiResponse> {
  const {
    contentType,
    data,
    sizeBytes = data instanceof Uint8Array ? data.byteLength : 1024,
    checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // Default SHA-256 placeholder if omitted
    purpose = "WASTE_SUBMISSION",
    idempotencyKey,
    onProgress,
  } = options;

  // Phase 1: Request upload ticket
  onProgress?.("REQUESTING_TICKET");
  const ticket = await mobileApiClient.media.createUploadTicket({
    contentType,
    sizeBytes,
    checksum,
    purpose,
  });

  if (!ticket.uploadUrl || !ticket.mediaId) {
    throw new Error("Invalid upload ticket returned from server.");
  }

  // Phase 2: Binary direct upload
  onProgress?.("UPLOADING_BYTES");
  let uploadUrl = ticket.uploadUrl;
  try {
    const currentBaseUrl = getMobileServerUrl();
    const currentOrigin = new URL(currentBaseUrl).origin;
    if (uploadUrl.includes("localhost:8080") || uploadUrl.includes("127.0.0.1:8080")) {
      uploadUrl = uploadUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):8080/, currentOrigin);
    }
  } catch {
    // If URL parsing fails, retain original ticket.uploadUrl
  }

  await mobileApiClient.media.directUpload(uploadUrl, data, contentType);

  // Phase 3: Idempotent confirmation
  onProgress?.("CONFIRMING");
  const confirmedMedia = await mobileApiClient.media.confirmUpload(
    ticket.mediaId,
    {},
    { idempotencyKey }
  );

  return confirmedMedia;
}
