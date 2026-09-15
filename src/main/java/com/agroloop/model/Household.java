package com.agroloop.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "households")
public class Household extends User {

    @Column(name = "token_balance", nullable = false, precision = 19, scale = 2)
    private BigDecimal tokenBalance;

    @Column(length = 500)
    private String address;

    protected Household() {
        // Required by JPA.
    }

    public Household(
            String name,
            String email,
            String passwordHash,
            String address
    ) {
        super(name, email, passwordHash, Role.ROLE_HOUSEHOLD);

        this.tokenBalance = BigDecimal.ZERO;
        this.address = address;
    }

    public BigDecimal getTokenBalance() {
        return tokenBalance;
    }

    public String getAddress() {
        return address;
    }

    public void changeAddress(String address) {
        this.address = address;
    }

    public void addTokens(BigDecimal amount) {
        validatePositiveAmount(amount);

        this.tokenBalance = this.tokenBalance.add(amount);
    }

    public void spendTokens(BigDecimal amount) {
        validatePositiveAmount(amount);

        if (this.tokenBalance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient token balance");
        }

        this.tokenBalance = this.tokenBalance.subtract(amount);
    }

    private void validatePositiveAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Token amount must be greater than zero"
            );
        }
    }
}
