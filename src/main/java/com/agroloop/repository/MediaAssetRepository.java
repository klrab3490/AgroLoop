package com.agroloop.repository;

import com.agroloop.model.MediaAsset;
import com.agroloop.model.MediaStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, String> {

    Optional<MediaAsset> findByIdAndOwnerId(String id, Long ownerId);

    List<MediaAsset> findAllByStatusAndExpiresAtBefore(MediaStatus status, LocalDateTime cutoff);
}
