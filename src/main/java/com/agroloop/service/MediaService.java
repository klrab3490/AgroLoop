package com.agroloop.service;

import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.MediaAsset;
import com.agroloop.model.MediaPurpose;
import com.agroloop.model.MediaStatus;
import com.agroloop.model.User;
import com.agroloop.repository.MediaAssetRepository;
import com.agroloop.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final MediaAssetRepository mediaAssetRepository;
    private final UserRepository userRepository;
    private final String baseUrl;

    public MediaService(
            MediaAssetRepository mediaAssetRepository,
            UserRepository userRepository,
            @Value("${agroloop.media.base-url:http://localhost:8080/api/v1/media}") String baseUrl
    ) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.userRepository = userRepository;
        this.baseUrl = baseUrl;
    }

    @Transactional
    public UploadTicketResult createUploadTicket(Long userId, MediaPurpose purpose, String contentType, Long sizeBytes, String checksum) {
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported media type: " + contentType + ". Allowed: JPEG, PNG, WebP.");
        }
        if (sizeBytes == null || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Invalid file size. Must be between 1 byte and 10 MB.");
        }

        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        String mediaId = "med_" + UUID.randomUUID().toString().replace("-", "");
        String ext = contentType.equalsIgnoreCase("image/png") ? ".png" :
                contentType.equalsIgnoreCase("image/webp") ? ".webp" : ".jpg";
        String storageKey = purpose.name().toLowerCase() + "/" + UUID.randomUUID() + ext;
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(1);

        MediaAsset asset = new MediaAsset(
                mediaId,
                owner,
                purpose,
                storageKey,
                contentType,
                sizeBytes,
                checksum,
                MediaStatus.PENDING_UPLOAD,
                expiresAt
        );
        mediaAssetRepository.save(asset);

        String uploadUrl = baseUrl + "/upload/" + mediaId;
        return new UploadTicketResult(mediaId, uploadUrl, expiresAt, MAX_FILE_SIZE_BYTES);
    }

    @Transactional
    public MediaAsset confirmUpload(String mediaId, Long userId, String providedChecksum) {
        MediaAsset asset = mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + mediaId));

        if (!Objects.equals(asset.getOwner().getId(), userId)) {
            throw new AccessDeniedException("User does not have permission to confirm this media asset");
        }

        if (asset.getStatus() == MediaStatus.CONFIRMED || asset.getStatus() == MediaStatus.ATTACHED) {
            return asset; // Idempotent success
        }

        if (asset.isExpired()) {
            asset.expire();
            mediaAssetRepository.save(asset);
            throw new IllegalStateException("Upload ticket has expired for media: " + mediaId);
        }

        if (asset.getStatus() != MediaStatus.PENDING_UPLOAD) {
            throw new IllegalStateException("Cannot confirm media in status: " + asset.getStatus());
        }

        if (asset.getChecksum() != null && providedChecksum != null) {
            if (!asset.getChecksum().equalsIgnoreCase(providedChecksum.trim())) {
                throw new IllegalArgumentException("Provided checksum does not match upload ticket checksum");
            }
        }

        asset.confirm();
        return mediaAssetRepository.save(asset);
    }

    @Transactional
    public MediaAsset attachAsset(String mediaId, Long userId, MediaPurpose expectedPurpose) {
        MediaAsset asset = mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + mediaId));

        if (!Objects.equals(asset.getOwner().getId(), userId)) {
            throw new AccessDeniedException("User does not have permission to attach this media asset");
        }

        if (asset.getPurpose() != expectedPurpose) {
            throw new IllegalArgumentException("Media asset purpose mismatch. Expected: " + expectedPurpose + ", Found: " + asset.getPurpose());
        }

        if (asset.getStatus() == MediaStatus.ATTACHED) {
            return asset;
        }

        if (asset.getStatus() != MediaStatus.CONFIRMED) {
            throw new IllegalStateException("Media asset must be in CONFIRMED status before attachment. Current: " + asset.getStatus());
        }

        asset.attach();
        return mediaAssetRepository.save(asset);
    }

    @Transactional
    public MediaAsset attachMedia(String mediaId, Long userId, String targetEntity, Long targetId) {
        MediaPurpose purpose = "waste_submissions".equalsIgnoreCase(targetEntity)
                ? MediaPurpose.WASTE_SUBMISSION
                : MediaPurpose.PRODUCT_IMAGE;
        return attachAsset(mediaId, userId, purpose);
    }

    @Transactional(readOnly = true)
    public String generateDownloadUrl(String mediaId) {
        return baseUrl + "/download/" + mediaId;
    }

    @Transactional
    public int cleanupExpiredUploads() {
        List<MediaAsset> expiredAssets = mediaAssetRepository.findAllByStatusAndExpiresAtBefore(
                MediaStatus.PENDING_UPLOAD,
                LocalDateTime.now()
        );
        for (MediaAsset asset : expiredAssets) {
            asset.expire();
        }
        mediaAssetRepository.saveAll(expiredAssets);
        return expiredAssets.size();
    }

    public record UploadTicketResult(String mediaId, String uploadUrl, LocalDateTime expiresAt, long maxSizeBytes) {}
}
