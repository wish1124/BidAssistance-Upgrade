package com.nara.aivleTK.controller;

import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.service.bid.BidApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class BidApiController {

    private final BidApiService bidApiService;

    // 주소창에 localhost:8080/api/fetch 입력하면 실행됨
    @GetMapping("/api/fetch")
    public ResponseEntity<ApiResponse<String>> fetchApi() {
        String result = bidApiService.fetchAndSaveBidData();
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}