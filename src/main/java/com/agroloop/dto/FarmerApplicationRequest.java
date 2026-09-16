package com.agroloop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Form backing DTO for a Household user requesting conversion to a Farmer account.
 */
public class FarmerApplicationRequest {

    @NotBlank(message = "Farm or enterprise name is required")
    @Size(min = 2, max = 150, message = "Farm name must be between 2 and 150 characters")
    private String farmName;

    @NotBlank(message = "Farm location or agricultural address is required")
    @Size(min = 5, max = 500, message = "Farm address must be between 5 and 500 characters")
    private String farmAddress;

    @Size(max = 1000, message = "Agricultural notes cannot exceed 1000 characters")
    private String notes;

    public FarmerApplicationRequest() {
    }

    public FarmerApplicationRequest(String farmName, String farmAddress, String notes) {
        this.farmName = farmName;
        this.farmAddress = farmAddress;
        this.notes = notes;
    }

    public String getFarmName() {
        return farmName;
    }

    public void setFarmName(String farmName) {
        this.farmName = farmName;
    }

    public String getFarmAddress() {
        return farmAddress;
    }

    public void setFarmAddress(String farmAddress) {
        this.farmAddress = farmAddress;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
