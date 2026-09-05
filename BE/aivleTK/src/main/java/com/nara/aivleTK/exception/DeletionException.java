package com.nara.aivleTK.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class DeletionException extends RuntimeException  {
    public DeletionException(String message) {
        super(message);
    }
}
