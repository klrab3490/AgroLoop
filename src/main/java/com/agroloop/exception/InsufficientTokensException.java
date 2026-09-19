package com.agroloop.exception;

import java.math.BigDecimal;

/**
 * Thrown when a household attempts a marketplace checkout or token expenditure
 * exceeding their current available EcoToken balance.
 */
public class InsufficientTokensException extends RuntimeException {

    private final BigDecimal currentBalance;
    private final BigDecimal requiredTokens;

    public InsufficientTokensException(String message) {
        super(message);
        this.currentBalance = null;
        this.requiredTokens = null;
    }

    public InsufficientTokensException(BigDecimal currentBalance, BigDecimal requiredTokens) {
        super(String.format(
                "Insufficient EcoToken balance: required %s tokens, but current balance is %s tokens",
                requiredTokens != null ? requiredTokens.toPlainString() : "null",
                currentBalance != null ? currentBalance.toPlainString() : "null"
        ));
        this.currentBalance = currentBalance;
        this.requiredTokens = requiredTokens;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public BigDecimal getRequiredTokens() {
        return requiredTokens;
    }
}
