package com.agroloop.repository;

import com.agroloop.model.Farmer;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Acquires a pessimistic write lock (SELECT ... FOR UPDATE) on the product row
     * to ensure deterministic concurrency control and prevent inventory over-allocation.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    List<Product> findAllByActiveTrueOrderByCreatedAtDesc();

    List<Product> findByCategoryAndActiveTrueOrderByCreatedAtDesc(ProductCategory category);

    List<Product> findByFarmerOrderByCreatedAtDesc(Farmer farmer);

    List<Product> findByFarmerAndActiveTrueOrderByCreatedAtDesc(Farmer farmer);

    List<Product> findByFarmerIdAndActiveTrue(Long farmerId);

    List<Product> findByNameContainingIgnoreCaseAndActiveTrueOrderByCreatedAtDesc(String name);

    List<Product> findByCategoryAndNameContainingIgnoreCaseAndActiveTrueOrderByCreatedAtDesc(
            ProductCategory category,
            String name
    );
}
