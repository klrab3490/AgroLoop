package com.agroloop.repository;

import com.agroloop.model.Role;
import com.agroloop.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.enabled = true ORDER BY u.id ASC")
    List<User> findActiveUsersByRoleForUpdate(@Param("role") Role role);

    List<User> findAllByOrderByCreatedAtDesc();
}
