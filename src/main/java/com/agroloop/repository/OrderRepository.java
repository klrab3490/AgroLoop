package com.agroloop.repository;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByHouseholdOrderByCreatedAtDesc(Household household);

    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i WHERE i.product.farmer = :farmer ORDER BY o.createdAt DESC")
    List<Order> findOrdersForFarmer(@Param("farmer") Farmer farmer);
}
