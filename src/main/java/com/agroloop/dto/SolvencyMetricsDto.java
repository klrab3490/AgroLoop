package com.agroloop.dto;

import java.math.BigDecimal;

/**
 * Data Transfer Object capturing platform-wide financial solvency and reconciliation metrics.
 */
public class SolvencyMetricsDto {

    private final BigDecimal totalHouseholdBalances;
    private final BigDecimal totalCredits;
    private final BigDecimal totalDebits;
    private final BigDecimal expectedBalance;
    private final BigDecimal discrepancy;
    private final boolean solvent;

    public SolvencyMetricsDto(
            BigDecimal totalHouseholdBalances,
            BigDecimal totalCredits,
            BigDecimal totalDebits
    ) {
        this.totalHouseholdBalances = totalHouseholdBalances != null ? totalHouseholdBalances : BigDecimal.ZERO;
        this.totalCredits = totalCredits != null ? totalCredits : BigDecimal.ZERO;
        this.totalDebits = totalDebits != null ? totalDebits : BigDecimal.ZERO;
        this.expectedBalance = this.totalCredits.subtract(this.totalDebits);
        this.discrepancy = this.totalHouseholdBalances.subtract(this.expectedBalance);
        this.solvent = this.discrepancy.compareTo(BigDecimal.ZERO) == 0;
    }

    public BigDecimal getTotalHouseholdBalances() {
        return totalHouseholdBalances;
    }

    public BigDecimal getTotalCredits() {
        return totalCredits;
    }

    public BigDecimal getTotalDebits() {
        return totalDebits;
    }

    public BigDecimal getExpectedBalance() {
        return expectedBalance;
    }

    public BigDecimal getDiscrepancy() {
        return discrepancy;
    }

    public boolean isSolvent() {
        return solvent;
    }
}
