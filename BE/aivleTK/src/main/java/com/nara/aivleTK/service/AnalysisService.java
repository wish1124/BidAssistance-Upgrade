package com.nara.aivleTK.service;

import com.nara.aivleTK.domain.AnalysisResult;
import com.nara.aivleTK.domain.Attachment.Attachment;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.dto.AnalysisResultDto;
import com.nara.aivleTK.dto.fastapi.FastApiAnalyzeRequest;   // 추가
import com.nara.aivleTK.dto.fastapi.FastApiAnalyzeResponse;  // 추가
import com.nara.aivleTK.repository.AnalysisResultRepository;
import com.nara.aivleTK.repository.BidRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisService {
    private final AnalysisResultRepository analysisResultRepository;
    private final BidRepository bidRepository;
    private final WebClient webClient;
    private final AttachmentService attachmentService; // 필요시 사용

    @Transactional
    public AnalysisResultDto analyzeAndSave(Integer bidId) {
        // 1. 공고 조회
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid bid ID: " + bidId));

        try {
            // 2. Python 서버에 보낼 텍스트 생성
            String bidText = createPromptFromBid(bid);

            List<String> fileUrls = new ArrayList<>();
            if (bid.getAttachments() != null) {
                fileUrls = bid.getAttachments().stream()
                        .map(Attachment::getUrl)         // Attachment 객체에서 URL 추출
                        .filter(url -> url != null && !url.isBlank()) // 유효한 URL만 필터링
                        .collect(Collectors.toList());
            }

            FastApiAnalyzeRequest requestDto = FastApiAnalyzeRequest.builder()
                    .text(bidText)
                    .threadId(String.valueOf(bidId)) // thread_id로 bidId 사용
                    .fileUrls(fileUrls)
                    .build();

            // 3. AI 서버 요청 (엔드포인트 /analyze 로 변경)
            FastApiAnalyzeResponse response = webClient.post()
                    .uri("/analyze") // ★ Python 서버의 엔드포인트와 일치시킴
                    .bodyValue(requestDto)
                    .retrieve()
                    .bodyToMono(FastApiAnalyzeResponse.class)
                    .block();

            if (response == null) {
                throw new IllegalStateException("AI 서버 응답이 비어있습니다.");
            }

            // 4. 결과 저장
            AnalysisResult entity = analysisResultRepository.findByBid(bid)
                            .orElse(new AnalysisResult());
            entity.setBid(bid);
            entity.setAnalysisDate(LocalDateTime.now());

            // Python 결과 매핑
            if (response.getPrediction() != null) {
                entity.setPredictedPrice(response.getPrediction().getPointEstimate());
                // 필요하다면 min/max 값도 저장 가능
            }

            entity.setAnalysisContent(response.getReport()); // 마크다운 리포트 저장
            entity.setPdfUrl(response.getPdfLink());         // Azure PDF 링크 저장

            // 아래 필드들은 Python 결과에 없으므로 기본값 처리하거나
            // Python 서버에서 extracted_requirements를 파싱해서 넣어야 함
            entity.setGoldenRate(BigDecimal.ZERO);
            entity.setAvgRate(BigDecimal.ZERO);
            entity.setContractMethod("분석 결과 참조");
            entity.setTrackRecord("분석 결과 참조");
            entity.setQualification("분석 결과 참조");

            AnalysisResult saveEntity =  analysisResultRepository.save(entity);
            log.info("✅ AI 분석 완료 및 저장 [공고: {}]", bid.getBidRealId());
            return AnalysisResultDto.from(saveEntity);

        } catch (WebClientRequestException e) {
            log.error("❌ AI 서버 연결 실패 (URL 확인 필요): {}", e.getMessage());
            throw new RuntimeException("AI 서버 연결 실패", e);
        } catch (Exception e) {
            log.error("❌ AI 분석 중 오류 발생: {}", e.getMessage(), e);
            throw new RuntimeException("AI 서버 연결 실패", e);
        }
    }


    // Bid 객체의 정보를 RAG 모델이 이해하기 쉬운 텍스트로 변환하는 헬퍼 메소드
    private String createPromptFromBid(Bid bid) {
        StringBuilder sb = new StringBuilder();
        sb.append("공고명: ").append(bid.getName()).append("\n");
        sb.append("공고번호: ").append(bid.getBidRealId()).append("\n");
        sb.append("수요기관: ").append(bid.getOrganization()).append("\n");
        sb.append("지역: ").append(bid.getRegion()).append("\n");
        if(bid.getBasicPrice() != null)
            sb.append("기초금액: ").append(bid.getBasicPrice()).append("\n");
        if(bid.getEstimatePrice() != null)
            sb.append("추정가격: ").append(bid.getEstimatePrice()).append("\n");
        if(bid.getBidRange() != null)
            sb.append("예가범위: ").append(bid.getBidRange()).append("%\n");
        if(bid.getMinimumBidRate() != null)
            sb.append("낙찰하한율: ").append(bid.getMinimumBidRate()).append("%\n");

        sb.append("\n위 공고 정보를 바탕으로 입찰 분석을 수행해줘.");
        return sb.toString();
    }
}