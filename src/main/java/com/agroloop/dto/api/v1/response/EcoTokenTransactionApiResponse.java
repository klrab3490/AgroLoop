package com.agroloop.dto.api.v1.response;

import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record EcoTokenTransactionApiResponse(
        Long id,
        Long householdId,
        BigDecimal amount,
        TransactionType transactionType,
        TransactionDirection direction,
        String description,
        Long referenceId,
        BigDecimal balanceAfter,
        LocalDateTime createdAt
) {
    public static EcoTokenTransactionApiResponse from(EcoTokenTransaction tx) {
        if (tx == null) {
            return null;
        }
        Long householdId = tx.getHousehold() != null ? tx.getHousehold().getId() : null;
        Long refId = tx.getOrder() != null ? tx.getOrder().getId() :
                (tx.getWasteVerification() != null ? tx.getWasteVerification().getId() : null);
        return new EcoTokenTransactionApiResponse(
                tx.getId(),
                householdId,
                tx.getAmount(),
                tx.getTransactionType(),
                tx.getDirection(),
                tx.getDescription(),
                refId,
                tx.getBalanceAfter(),
                tx.getCreatedAt()
        );
    }
}
