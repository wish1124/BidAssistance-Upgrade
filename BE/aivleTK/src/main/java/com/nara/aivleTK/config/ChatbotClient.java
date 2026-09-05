package com.nara.aivleTK.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Qualifier;


import java.io.IOException;
import java.util.Map;

@Component
@Slf4j
public class ChatbotClient {
    private final RestClient restClient;

    public ChatbotClient(@Qualifier("pythonRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public String sendFileAndText(String text, MultipartFile file){
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("text",text);
            if(file!=null && !file.isEmpty()){
                Resource fileResource = convertToFileResource(file);
                body.add("file",fileResource);
            }

            // 1. 응답 받기 (Map으로 받음)
            Map response = restClient.post()
                    .uri("/chat/file")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            // 2. [수정] 유연하게 키 값 확인하기
            if (response != null) {
                // (1) 사용자가 확인한 'report' 키가 있는지 먼저 확인
                if (response.containsKey("report")) {
                    return String.valueOf(response.get("report"));
                }

                // (2) 기존 'response' 키 확인 (혹시 몰라 남겨둠)
                if (response.containsKey("response")) {
                    return String.valueOf(response.get("response"));
                }

                // (3) [중요] 로그에 찍혔던 'rationale'(분석 결과) 확인
                // 로그상의 JSON에는 report/response 키가 없고 이게 메인 텍스트일 수 있습니다.
                if (response.containsKey("rationale")) {
                    Object estimate = response.get("point_estimate");
                    return "분석 결과: " + response.get("rationale") +
                            (estimate != null ? "\n예측치: " + estimate : "");
                }

                // (4) 정 못 찾겠으면 전체 데이터를 문자열로 반환 (디버깅용)
                log.info("알 수 없는 응답 포맷: {}", response);
                return "응답 데이터: " + response.toString();
            }

            return "AI서버 응답없음 (데이터 null)";

        } catch (Exception e) {
            log.error("AI 서버 통신 중 에러 발생", e);
            return "시스템 에러: " + e.getMessage();
        }
    }
    private Resource convertToFileResource(MultipartFile file) throws IOException {
        return new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                // 파일명이 누락되지 않도록 원본 파일명 반환
                return file.getOriginalFilename();
            }
        };
    }
}
