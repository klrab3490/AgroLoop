package com.agroloop.controller.api;

import com.agroloop.exception.ExpiredTokenException;
import com.agroloop.exception.IdempotencyConflictException;
import com.agroloop.exception.InsufficientStockException;
import com.agroloop.exception.InsufficientTokensException;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.RateLimitExceededException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.exception.RevokedTokenException;
import com.agroloop.exception.TokenFamilyRevokedException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice(basePackages = "com.agroloop.controller.api.v1")
public class RestExceptionHandler {

    private ProblemDetail buildProblem(HttpStatus status, String code, String title, String detail, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create("https://agroloop.com/errors/" + code.toLowerCase().replace("_", "-")));
        problem.setTitle(title);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        problem.setProperty("timestamp", Instant.now());

        String requestId = (String) request.getAttribute("requestId");
        if (requestId != null) {
            problem.setProperty("requestId", requestId);
        }
        return problem;
    }

    @ExceptionHandler(ExpiredTokenException.class)
    public ResponseEntity<ProblemDetail> handleExpiredToken(ExpiredTokenException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(buildProblem(HttpStatus.UNAUTHORIZED, "EXPIRED_TOKEN", "Expired Token", ex.getMessage(), request));
    }

    @ExceptionHandler(RevokedTokenException.class)
    public ResponseEntity<ProblemDetail> handleRevokedToken(RevokedTokenException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(buildProblem(HttpStatus.UNAUTHORIZED, "REVOKED_TOKEN", "Revoked Token", ex.getMessage(), request));
    }

    @ExceptionHandler(TokenFamilyRevokedException.class)
    public ResponseEntity<ProblemDetail> handleFamilyRevoked(TokenFamilyRevokedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(buildProblem(HttpStatus.UNAUTHORIZED, "TOKEN_FAMILY_REVOKED", "Token Family Revoked", ex.getMessage(), request));
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthenticationException(org.springframework.security.core.AuthenticationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(buildProblem(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized", ex.getMessage(), request));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildProblem(HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden", ex.getMessage(), request));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildProblem(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Resource Not Found", ex.getMessage(), request));
    }

    @ExceptionHandler(MissingIdempotencyKeyException.class)
    public ResponseEntity<ProblemDetail> handleMissingKey(MissingIdempotencyKeyException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildProblem(HttpStatus.BAD_REQUEST, "MISSING_IDEMPOTENCY_KEY", "Missing Idempotency Key", ex.getMessage(), request));
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ProblemDetail> handleIdempotencyConflict(IdempotencyConflictException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildProblem(HttpStatus.CONFLICT, ex.getCode(), "Idempotency Conflict", ex.getMessage(), request));
    }

    @ExceptionHandler(InsufficientTokensException.class)
    public ResponseEntity<ProblemDetail> handleInsufficientTokens(InsufficientTokensException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildProblem(HttpStatus.CONFLICT, "INSUFFICIENT_TOKENS", "Insufficient Token Balance", ex.getMessage(), request));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ProblemDetail> handleInsufficientStock(InsufficientStockException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildProblem(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Insufficient Product Stock", ex.getMessage(), request));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ProblemDetail> handleIllegalState(IllegalStateException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildProblem(HttpStatus.CONFLICT, "STATE_CONFLICT", "Invalid State Transition", ex.getMessage(), request));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildProblem(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Bad Request", ex.getMessage(), request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        ProblemDetail problem = buildProblem(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "Validation Failed", "One or more fields failed validation", request);

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        problem.setProperty("fieldErrors", fieldErrors);

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ProblemDetail> handleRateLimit(RateLimitExceededException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(buildProblem(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Too Many Requests", ex.getMessage(), request));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGenericException(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildProblem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Internal Server Error", "An unexpected error occurred. Please contact support.", request));
    }
}
