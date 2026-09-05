package com.nara.aivleTK.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FastApiAnalyzeRequest {
    private String text;       // 분석할 텍스트 (Bid 정보 + BidDetail 정보)

    @JsonProperty("thread_id")  //  새로 추가 (Python의 snake_case로 전송)
    private String threadId;   // 스레드 ID (기본값: bidId)

    @JsonProperty("file_urls")
    private List<String> fileUrls;
}