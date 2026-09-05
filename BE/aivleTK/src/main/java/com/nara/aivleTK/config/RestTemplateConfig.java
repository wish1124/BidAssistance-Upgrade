package com.nara.aivleTK.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;

@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(50000);
        requestFactory.setReadTimeout(300000);
        RestTemplate restTemplate = new RestTemplate(requestFactory);

// 2. [추가] "octet-stream"도 JSON으로 인식하게 만드는 컨버터 추가
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(Arrays.asList(
                MediaType.APPLICATION_JSON,
                MediaType.APPLICATION_OCTET_STREAM // 이 부분이 핵심입니다!
        ));
        restTemplate.getMessageConverters().add(0, converter); // 우선순위 높게 추가

        return restTemplate;
    }
}
