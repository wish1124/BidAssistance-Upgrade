package com.nara.aivleTK.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestClient;

import java.util.Arrays;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient pythonRestClient(){
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(120000);
        requestFactory.setReadTimeout(120000);

        // [핵심] RestClient용 컨버터 생성
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(Arrays.asList(
                MediaType.APPLICATION_JSON,
                MediaType.APPLICATION_OCTET_STREAM // 여기서도 octet-stream을 허용해줘야 합니다!
        ));

        return RestClient.builder()
                .baseUrl("https://aivleachatbot.greenpond-9eab36ab.koreacentral.azurecontainerapps.io")
                .requestFactory(requestFactory)
                // [핵심] 컨버터 추가
                .messageConverters(converters -> converters.add(0, converter))
                .build();
    }
}