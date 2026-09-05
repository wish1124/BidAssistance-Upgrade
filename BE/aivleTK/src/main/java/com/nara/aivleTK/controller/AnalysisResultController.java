package com.nara.aivleTK.controller;

import com.nara.aivleTK.domain.AnalysisResult;
import com.nara.aivleTK.dto.AnalysisResultDto;
import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analysis")
public class AnalysisResultController {
    private final AnalysisService analysisService;

    // 1. 분석 요청 API (프론트에서 '분석하기' 버튼 클릭 시 호출)
    @PostMapping("/predict/{bidId:\\d+}")
    public ResponseEntity<ApiResponse<AnalysisResultDto>> performAnalysis(@PathVariable Integer bidId) {
        AnalysisResultDto result =  analysisService.analyzeAndSave(bidId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

}
