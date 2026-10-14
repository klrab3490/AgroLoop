package com.agroloop.repository;

import com.agroloop.model.CollectionRoute;
import com.agroloop.model.RouteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CollectionRouteRepository extends JpaRepository<CollectionRoute, Long> {

    List<CollectionRoute> findByFarmerIdOrderByRouteDateDesc(Long farmerId);

    List<CollectionRoute> findByFarmerIdAndRouteDate(Long farmerId, LocalDate routeDate);

    List<CollectionRoute> findByFarmerIdAndStatusIn(Long farmerId, List<RouteStatus> statuses);

    @Query("SELECT DISTINCT r FROM CollectionRoute r LEFT JOIN FETCH r.stops s LEFT JOIN FETCH s.pickupRequest p LEFT JOIN FETCH p.wasteSubmission WHERE r.id = :id")
    Optional<CollectionRoute> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT DISTINCT r FROM CollectionRoute r LEFT JOIN FETCH r.stops s LEFT JOIN FETCH s.pickupRequest p LEFT JOIN FETCH p.wasteSubmission WHERE r.farmer.id = :farmerId AND r.status IN ('PLANNED', 'IN_PROGRESS') ORDER BY r.routeDate ASC, r.id ASC")
    List<CollectionRoute> findActiveRoutesWithStops(@Param("farmerId") Long farmerId);
}
