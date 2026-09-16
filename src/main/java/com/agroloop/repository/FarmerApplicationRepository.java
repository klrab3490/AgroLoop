package com.agroloop.repository;

import com.agroloop.model.FarmerApplication;
import com.agroloop.model.FarmerApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FarmerApplicationRepository extends JpaRepository<FarmerApplication, Long> {

    List<FarmerApplication> findByStatusOrderByCreatedAtDesc(FarmerApplicationStatus status);

    List<FarmerApplication> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<FarmerApplication> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndStatus(Long userId, FarmerApplicationStatus status);
}
