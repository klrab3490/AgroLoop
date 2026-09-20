package com.agroloop.security.idempotency;

public sealed interface IdempotencyScope permits IdempotencyScope.UserScope, IdempotencyScope.RefreshScope {

    String getScopeKey();
    Long getUserId();

    record UserScope(Long userId) implements IdempotencyScope {
        @Override
        public String getScopeKey() {
            return "user:" + userId;
        }

        @Override
        public Long getUserId() {
            return userId;
        }
    }

    record RefreshScope(String refreshTokenHash) implements IdempotencyScope {
        @Override
        public String getScopeKey() {
            return "refresh:" + refreshTokenHash;
        }

        @Override
        public Long getUserId() {
            return null;
        }
    }

    static IdempotencyScope user(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId cannot be null for UserScope");
        }
        return new UserScope(userId);
    }

    static IdempotencyScope refresh(String refreshTokenHash) {
        if (refreshTokenHash == null || refreshTokenHash.isBlank()) {
            throw new IllegalArgumentException("refreshTokenHash cannot be blank for RefreshScope");
        }
        return new RefreshScope(refreshTokenHash);
    }
}
