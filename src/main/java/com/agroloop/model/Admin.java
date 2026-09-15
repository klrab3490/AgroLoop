package com.agroloop.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "admins")
public class Admin extends User {

    protected Admin() {
        // Required by JPA.
    }

    public Admin(
            String name,
            String email,
            String passwordHash
    ) {
        super(name, email, passwordHash, Role.ROLE_ADMIN);
    }

    public boolean canManageUsers() {
        return true;
    }

    public boolean canManageWasteRules() {
        return true;
    }

    public boolean canManagePickups() {
        return true;
    }

    public boolean canReviewDisputes() {
        return true;
    }
}
