package com.nara.aivleTK.controller;

import com.nara.aivleTK.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/")
    public ResponseEntity<ApiResponse<String>> home() {
        return ResponseEntity.ok(ApiResponse.success("서버가 정상적으로 작동 중입니다! Hello World!"));
    }
}