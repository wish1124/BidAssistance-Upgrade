package com.nara.aivleTK.exception;


import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
public class TransactionRollbackException extends RuntimeException {
    public TransactionRollbackException(String message) {
        super(message);
    }
}
