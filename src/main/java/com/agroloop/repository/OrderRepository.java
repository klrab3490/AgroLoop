package com.agroloop.repository;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByHouseholdOrderByCreatedAtDesc(Household household);

    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i WHERE i.farmerId = :farmerId ORDER BY o.createdAt DESC")
    List<Order> findOrdersForFarmerId(@Param("farmerId") Long farmerId);

    default List<Order> findOrdersForFarmer(Farmer farmer) {
        return findOrdersForFarmerId(farmer.getId());
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    List<Order> findAllByOrderByCreatedAtDesc();
}
