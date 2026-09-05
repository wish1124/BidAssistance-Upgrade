package com.nara.aivleTK.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import reactor.netty.http.client.HttpClient;
import java.time.Duration;

@Configuration
public class WebClientConfig {

    // 1. 기본값을 9999로 설정하고, 변수(fastApiBaseUrl)에 저장합니다.
    @Value("${fastapi.base-url:https://bid-prediction-api-v2.orangehill-6dfcc5e6.koreacentral.azurecontainerapps.io}")
    private String fastApiBaseUrl;

    @Bean
    public WebClient webClient() {
        // 2. AI 분석 시간(약 16초)을 고려하여 타임아웃을 60초로 넉넉하게 잡습니다.
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofSeconds(120));

        return WebClient.builder()
                // 3. 핵심 수정: "http://localhost:8000" 대신 변수명(fastApiBaseUrl)을 직접 넣습니다.
                .baseUrl(fastApiBaseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
}