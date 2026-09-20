package com.agroloop.repository;

import com.agroloop.model.MediaAsset;
import com.agroloop.model.MediaStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, String> {

    Optional<MediaAsset> findByIdAndOwnerId(String id, Long ownerId);

    List<MediaAsset> findAllByStatusAndExpiresAtBefore(MediaStatus status, LocalDateTime cutoff);
}
