package com.nara.aivleTK.dto.bid;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.nara.aivleTK.domain.Bid;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Getter
@NoArgsConstructor
@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class BidApiDto {

    // 1. 공고 기본 정보
    @JsonProperty("bidNtceNo")
    private String bidNtceNo;

    @JsonProperty("bidNtceOrd")
    private String bidNtceOrd;

    @JsonProperty("bidNtceNm")
    private String name;

    @JsonProperty("dminsttNm")
    private String organization;

    @JsonProperty("bidBeginDt")
    private String startDateStr;

    @JsonProperty("bidClseDt")
    private String endDateStr;

    @JsonProperty("opengDt")
    private String openDateStr;

    @JsonProperty("bidNtceDt")
    private String bidCreated;

    @JsonProperty("bidNtceDtlUrl")
    private String bidURL;

    @JsonProperty("constPlceNm")
    private String region;

    // 2. 금액 및 투찰 관련 정보

    @JsonProperty("presmptPrce") // 추정가격 (Estimated Price)
    private String estimatedPriceStr;

    @JsonProperty("VAT") // 부가세 (계산용)
    private String vatStr;

    @JsonProperty("bssamt") // ★ 기초금액 (Basic Price) - 직접 제공될 경우
    private String basicPriceStr;

    @JsonProperty("sucsfbidLwltRate") // 낙찰하한율
    private String minimumBidRate;

    @JsonProperty("rsrvtnPrceRngEndRate") // 투찰범위
    private String rangeEndStr;

    @JsonProperty("cntrctCnclsMthdNm") // 계약체결방법
    private String contractMethod;

    @JsonProperty("sucsfbidMthdNm") // 낙찰자결정방법
    private String successMethod;

    private Map<String, String> allFileMap = new HashMap<>();

    @JsonAnySetter
    public void setDynamicField(String key, Object value) {
        if (value != null && (key.startsWith("ntceSpecDocUrl") || key.startsWith("ntceSpecFileNm"))) {
            this.allFileMap.put(key, String.valueOf(value));
        }
    }

    // 3. DTO -> Entity 변환
    public Bid toEntity() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String realIdCombined = this.bidNtceNo + "-" + this.bidNtceOrd;

        // 1. 추정가격 파싱
        BigInteger estPrice = parseBigInt(this.estimatedPriceStr);

        // 2. 기초금액 결정 로직, API에서 'bssamt'를 줬으면 그걸 쓰고, 없으면 '추정가격 + 부가세'로 계산
        BigInteger finalBasicPrice = parseBigInt(this.basicPriceStr);
        if (finalBasicPrice.equals(BigInteger.ZERO)) {
            BigInteger vat = parseBigInt(this.vatStr);
            finalBasicPrice = estPrice.add(vat);
        }

        // 3. 투찰범위 파싱
        Double rangeAbs = parseRangeToAbs(this.rangeEndStr);

        return Bid.builder()
                .bidRealId(realIdCombined)
                .name(this.name)
                .organization(this.organization)
                .bidURL(this.bidURL)
                .region(this.region)
                .startDate(parseDate(this.startDateStr, formatter) != null ? parseDate(this.startDateStr, formatter)
                        : (parseDate(this.openDateStr, formatter) != null ? parseDate(this.openDateStr, formatter)
                                : LocalDateTime.now()))
                .endDate(parseDate(this.endDateStr, formatter))
                .openDate(parseDate(this.openDateStr, formatter) != null ? parseDate(this.openDateStr, formatter)
                        : LocalDateTime.now())
                .bidCreated(parseDate(this.bidCreated, formatter))

                // 금액 정보 저장
                .estimatePrice(estPrice) // 추정가격
                .basicPrice(finalBasicPrice) // 기초금액

                // 투찰율 정보 저장
                .minimumBidRate(parseDouble(this.minimumBidRate)) // 낙찰하한율
                .bidRange(rangeAbs) // 투찰범위

                .build();
    }

    // 4. Helper Methods

    // BigInteger 파싱
    private BigInteger parseBigInt(String str) {
        if (str == null || str.trim().isEmpty())
            return BigInteger.ZERO;
        try {
            return new BigInteger(str.replaceAll(",", "").trim());
        } catch (Exception e) {
            return BigInteger.ZERO;
        }
    }

    // Double 파싱
    private Double parseDouble(String str) {
        if (str == null || str.trim().isEmpty())
            return 0.0;
        try {
            return Double.parseDouble(str.trim());
        } catch (Exception e) {
            return 0.0;
        }
    }

    // 투찰범위 절댓값 파싱
    private Double parseRangeToAbs(String str) {
        if (str == null || str.trim().isEmpty())
            return 0.0;
        try {
            String cleanStr = str.replace("+", "")
                    .replace("-", "")
                    .replace("%", "")
                    .trim();
            return Math.abs(Double.parseDouble(cleanStr));
        } catch (Exception e) {
            return 0.0;
        }
    }

    // 날짜 파싱
    private LocalDateTime parseDate(String dateStr, DateTimeFormatter formatter) {
        if (dateStr == null || dateStr.trim().isEmpty())
            return null;
        try {
            return LocalDateTime.parse(dateStr, formatter);
        } catch (Exception e) {
            return null;
        }
    }
}