package com.agroloop.exception;

public class HandshakeAlreadyConsumedException extends RuntimeException {
    public HandshakeAlreadyConsumedException(String message) {
        super(message);
    }
}
