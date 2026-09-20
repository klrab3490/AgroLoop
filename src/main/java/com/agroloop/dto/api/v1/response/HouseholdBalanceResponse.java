package com.agroloop.dto.api.v1.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record HouseholdBalanceResponse(
        Long householdId,
        BigDecimal availableBalance,
        BigDecimal pendingBalance,
        LocalDateTime lastAuditedLedgerTimestamp
) {
    public HouseholdBalanceResponse(Long householdId, BigDecimal availableBalance, LocalDateTime lastAuditedLedgerTimestamp) {
        this(householdId, availableBalance, BigDecimal.ZERO, lastAuditedLedgerTimestamp);
    }
}
