package com.nara.aivleTK.dto;

import com.nara.aivleTK.domain.AnalysisResult;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class AnalysisResultDto {
    private List<String> attachmentUrls;
    private int id;                // 분석 결과 ID
    private Integer bidId;          // 공고 ID (Bid 객체 대신 ID만 반환)
    private String bidName;         // 공고명 (편의상 추가)
    private Long predictedPrice; // AI 예측 가격
    private String analysisContent; // 분석 리포트 내용
    private String pdfUrl;          // PDF 다운로드 링크
    private LocalDateTime analysisDate; // 분석 시각

    public static AnalysisResultDto from(AnalysisResult entity) {
        return AnalysisResultDto.builder()
                .id(entity.getAnalysisResultId())
                .bidId(entity.getBid().getBidId()) // 여기서 Bid 안에 있는 Attachment는 건드리지 않고 ID만 쏙 뺌!
                .bidName(entity.getBid().getName()) // 공고 이름 정도는 가져와도 안전함
                .predictedPrice(entity.getPredictedPrice())
                .analysisContent(entity.getAnalysisContent())
                .pdfUrl(entity.getPdfUrl())
                .analysisDate(entity.getAnalysisDate())
                .build();
    }
}