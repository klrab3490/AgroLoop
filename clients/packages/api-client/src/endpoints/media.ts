import type {
  UploadTicketApiRequest,
  UploadTicketApiResponse,
  ConfirmMediaApiRequest,
  MediaAssetApiResponse,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";
import type { MutationOptions } from "../idempotency.js";

export interface MediaEndpoints {
  createUploadTicket(request: UploadTicketApiRequest): Promise<UploadTicketApiResponse>;
  directUpload(uploadUrl: string, data: Blob | ArrayBuffer | Uint8Array, contentType: string): Promise<void>;
  confirmUpload(mediaId: string, request: ConfirmMediaApiRequest, options?: MutationOptions): Promise<MediaAssetApiResponse>;
  downloadMediaUrl(mediaId: string): string;
}

export function createMediaEndpoints(client: AgroLoopApiClient): MediaEndpoints {
  return {
    async createUploadTicket(request: UploadTicketApiRequest) {
      return client.post<UploadTicketApiResponse>("/media/upload-ticket", request);
    },

    async directUpload(uploadUrl: string, data: Blob | ArrayBuffer | Uint8Array, contentType: string) {
      // Direct binary PUT to uploadUrl without JSON serialization
      const headers = new Headers({
        "Content-Type": contentType,
      });

      // If uploading to internal AgroLoop proxy/backend, include Bearer token if available
      if (uploadUrl.startsWith("/") || uploadUrl.includes("/api/proxy/") || uploadUrl.includes("/api/v1/media/upload/")) {
        const token = await client.session.getAccessToken();
        if (token && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }

      const fetchTarget = typeof window !== "undefined" ? window : globalThis;
      const rawFetch = globalThis.fetch;
      const response = await rawFetch.call(fetchTarget, uploadUrl, {
        method: "PUT",
        headers,
        body: data as BodyInit,
      });
      if (!response.ok) {
        throw new Error(`Media direct upload failed with status ${response.status}`);
      }
    },

    async confirmUpload(mediaId: string, request: ConfirmMediaApiRequest, options?: MutationOptions) {
      return client.post<MediaAssetApiResponse>(`/media/${mediaId}/confirm`, request, {
        idempotentMutation: true,
        idempotencyKey: options?.idempotencyKey,
      });
    },

    downloadMediaUrl(mediaId: string) {
      return `${client.baseUrl}/api/v1/media/download/${mediaId}`;
    },
  };
}
