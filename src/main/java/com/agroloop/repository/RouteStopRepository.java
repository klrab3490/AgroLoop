package com.agroloop.repository;

import com.agroloop.model.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, Long> {

    List<RouteStop> findByRouteIdOrderByStopOrderAsc(Long routeId);

    Optional<RouteStop> findByRouteIdAndStopOrder(Long routeId, int stopOrder);

    Optional<RouteStop> findByRouteIdAndPickupRequestId(Long routeId, Long pickupRequestId);
}
