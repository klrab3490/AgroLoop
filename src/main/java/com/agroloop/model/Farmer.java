package com.agroloop.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "farmers")
public class Farmer extends User {

    @Column(name = "farm_name", nullable = false, length = 150)
    private String farmName;

    @Column(name = "farm_address", nullable = false, length = 500)
    private String farmAddress;

    @Column(length = 1000)
    private String notes;

    protected Farmer() {
        // Required by JPA.
    }

    public Farmer(
            String name,
            String email,
            String passwordHash,
            String farmName,
            String farmAddress,
            String notes
    ) {
        super(name, email, passwordHash, Role.ROLE_FARMER);

        this.farmName = requireText(farmName, "Farm name");
        this.farmAddress = requireText(farmAddress, "Farm address");
        this.notes = notes;
    }

    public User getUser() {
        return this;
    }

    public String getFarmName() {
        return farmName;
    }

    public String getFarmAddress() {
        return farmAddress;
    }

    public String getNotes() {
        return notes;
    }

    public void updateFarmDetails(
            String farmName,
            String farmAddress,
            String notes
    ) {
        this.farmName = requireText(farmName, "Farm name");
        this.farmAddress = requireText(farmAddress, "Farm address");
        this.notes = notes;
    }
}
