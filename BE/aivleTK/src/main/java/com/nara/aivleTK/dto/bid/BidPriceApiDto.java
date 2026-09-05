package com.nara.aivleTK.dto.bid;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigInteger;

@Getter
@NoArgsConstructor
@ToString
@JsonIgnoreProperties(ignoreUnknown = true) // 정의하지 않은 필드는 무시 (에러 방지)
public class BidPriceApiDto {

    @JsonProperty("bidNtceNo")
    private String bidNtceNo;

    // API JSON 필드명: "bssamt" -> 기초금액
    @JsonProperty("bssamt")
    private String basicPriceStr;

    // API JSON 필드명: "rsrvtnPrceRngEndRate" -> 투찰범위 상한
    @JsonProperty("rsrvtnPrceRngEndRate")
    private String rangeEndStr;

    // Helper Methods: 서비스에서 갖다 쓰는 메서드들

    // 1. 기초금액을 BigInteger로 변환하여 반환
    public BigInteger getBasicPrice() {
        if (basicPriceStr == null || basicPriceStr.trim().isEmpty()) {
            return BigInteger.ZERO;
        }
        try {
            // 쉼표 제거 후 변환
            return new BigInteger(basicPriceStr.replaceAll(",", "").trim());
        } catch (Exception e) {
            return BigInteger.ZERO;
        }
    }

    // 2. 투찰범위를 깔끔한 숫자(Double)로 변환하여 반환
    public Double getBidRangeAbs() {
        if (rangeEndStr == null || rangeEndStr.trim().isEmpty()) {
            return 0.0;
        }
        try {
            // "+", "-", "%" 문자 제거 후 절댓값 처리
            String cleanStr = rangeEndStr.replace("+", "")
                    .replace("-", "")
                    .replace("%", "")
                    .trim();
            return Math.abs(Double.parseDouble(cleanStr));
        } catch (Exception e) {
            return 0.0;
        }
    }
}