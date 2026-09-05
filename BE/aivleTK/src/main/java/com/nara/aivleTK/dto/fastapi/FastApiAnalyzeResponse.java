package com.nara.aivleTK.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FastApiAnalyzeResponse {

    @JsonProperty("extracted_requirements")
    private Map<String, Object> extractedRequirements; // FastAPI가 추출한 요구사항

    @JsonProperty("prediction")
    private PredictionResult prediction; // 예측 결과

    @JsonProperty("report")
    private String report; // 분석 리포트 (마크다운)

    @JsonProperty("pdf_link")
    private String pdfLink;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PredictionResult {
        private String currency;           // 통화 (KRW)

        @JsonProperty("point_estimate")
        private Long pointEstimate;        // 예측 낙찰가

        @JsonProperty("predicted_min")
        private Long predictedMin;         // 예측 최소값

        @JsonProperty("predicted_max")
        private Long predictedMax;         // 예측 최대값

        private String confidence;         // 신뢰도 (high/medium/low)
        private String rationale;          // 예측 근거

        @JsonProperty("model_type")
        private String modelType;          // 모델 타입
    }
}