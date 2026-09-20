package com.agroloop.controller.api.v1;

import com.agroloop.dto.api.v1.request.ConfirmMediaApiRequest;
import com.agroloop.dto.api.v1.request.UploadTicketApiRequest;
import com.agroloop.dto.api.v1.response.MediaAssetApiResponse;
import com.agroloop.dto.api.v1.response.UploadTicketApiResponse;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.MediaAsset;
import com.agroloop.repository.MediaAssetRepository;
import com.agroloop.security.authorization.OrderSecurityEvaluator;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import com.agroloop.service.MediaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;

@RestController
@RequestMapping("/api/v1/media")
public class MediaApiController {

    private final MediaService mediaService;
    private final MediaAssetRepository mediaAssetRepository;
    private final IdempotencyService idempotencyService;
    private final OrderSecurityEvaluator orderSecurityEvaluator;

    public MediaApiController(
            MediaService mediaService,
            MediaAssetRepository mediaAssetRepository,
            IdempotencyService idempotencyService,
            OrderSecurityEvaluator orderSecurityEvaluator
    ) {
        this.mediaService = mediaService;
        this.mediaAssetRepository = mediaAssetRepository;
        this.idempotencyService = idempotencyService;
        this.orderSecurityEvaluator = orderSecurityEvaluator;
    }

    @PostMapping("/upload-ticket")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UploadTicketApiResponse> createUploadTicket(
            @Valid @RequestBody UploadTicketApiRequest request,
            Authentication auth
    ) {
        Long userId = getUserId(auth);
        MediaService.UploadTicketResult result = mediaService.createUploadTicket(
                userId,
                request.purpose(),
                request.contentType(),
                request.sizeBytes(),
                request.checksum()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(new UploadTicketApiResponse(
                result.mediaId(),
                result.uploadUrl(),
                result.expiresAt(),
                result.maxSizeBytes()
        ));
    }

    @PostMapping("/{mediaId}/confirm")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MediaAssetApiResponse> confirmUpload(
            @PathVariable String mediaId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody ConfirmMediaApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for confirming media upload");
        }

        Long userId = getUserId(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(userId);

        MediaAssetApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/media/" + mediaId + "/confirm",
                request,
                MediaAssetApiResponse.class,
                () -> {
                    MediaAsset confirmed = mediaService.confirmUpload(mediaId, userId, request.checksum());
                    return MediaAssetApiResponse.from(confirmed);
                }
        );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/upload/{mediaId}")
    public ResponseEntity<Void> directUpload(
            @PathVariable String mediaId,
            InputStream inputStream
    ) {
        // Direct local/test upload endpoint
        MediaAsset asset = mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + mediaId));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/download/{mediaId}")
    public ResponseEntity<byte[]> downloadMedia(@PathVariable String mediaId) {
        MediaAsset asset = mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + mediaId));

        MediaType mediaType = MediaType.parseMediaType(
                asset.getContentType() != null ? asset.getContentType() : "application/octet-stream"
        );

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + mediaId + "\"")
                .body(new byte[0]);
    }

    private Long getUserId(Authentication auth) {
        Long id = orderSecurityEvaluator.extractUserId(auth);
        if (id == null) {
            throw new AccessDeniedException("Unauthenticated user");
        }
        return id;
    }
}
