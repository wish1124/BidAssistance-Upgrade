package com.nara.aivleTK.service.bid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.dto.bid.BidApiDto;
import com.nara.aivleTK.dto.bid.BidPriceApiDto;
import com.nara.aivleTK.repository.BidRepository;
import com.nara.aivleTK.service.AnalysisService;
import com.nara.aivleTK.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.util.StringUtils.hasText;

@Service
@RequiredArgsConstructor
@Slf4j
public class BidApiService {

    private final BidRepository bidRepository;
    private final AnalysisService analysisService;
    private final String SERVICE_KEY = "c1588436fef59fe2109d0eb3bd03747f61c57a482a6d0052de14f85b0bb02fb2";
    private final AttachmentService attachmentService;
    private final AlarmService alarmService;

    public String fetchAndSaveBidData() {
        try {
            // 1.공고 목록 API 호출
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime start = now.minusHours(12);
            LocalDateTime end = now.plusHours(12);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

            StringBuilder listUrlBuilder = new StringBuilder(
                    "http://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwk");
            listUrlBuilder.append("?" + URLEncoder.encode("serviceKey", "UTF-8") + "=" + SERVICE_KEY);
            listUrlBuilder
                    .append("&" + URLEncoder.encode("numOfRows", "UTF-8") + "=" + URLEncoder.encode("200", "UTF-8"));
            listUrlBuilder.append("&" + URLEncoder.encode("pageNo", "UTF-8") + "=" + URLEncoder.encode("1", "UTF-8"));
            listUrlBuilder.append("&" + URLEncoder.encode("inqryDiv", "UTF-8") + "=" + URLEncoder.encode("1", "UTF-8"));
            listUrlBuilder.append("&" + URLEncoder.encode("inqryBgnDt", "UTF-8") + "="
                    + URLEncoder.encode(start.format(fmt), "UTF-8"));
            listUrlBuilder.append(
                    "&" + URLEncoder.encode("inqryEndDt", "UTF-8") + "=" + URLEncoder.encode(end.format(fmt), "UTF-8"));
            listUrlBuilder.append("&" + URLEncoder.encode("type", "UTF-8") + "=" + URLEncoder.encode("json", "UTF-8"));

            URL listUrl = new URI(listUrlBuilder.toString()).toURL();
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(listUrl);
            JsonNode itemsNode = rootNode.path("response").path("body").path("items");

            if (itemsNode.isMissingNode() || itemsNode.isEmpty())
                return "데이터 없음";

            // DTO 원본을 담을 리스트 (URL 정보 보존용)
            List<BidApiDto> validDtos = new ArrayList<>();

            if (itemsNode.isArray()) {
                for (JsonNode node : itemsNode) {
                    BidApiDto dto = mapper.treeToValue(node, BidApiDto.class);
                    if (!isSkipTarget(dto))
                        validDtos.add(dto);
                }
            } else {
                BidApiDto dto = mapper.treeToValue(itemsNode.path("item"), BidApiDto.class);
                if (!isSkipTarget(dto))
                    validDtos.add(dto);
            }

            // 2. 중복 제거

            // DTO를 쉽게 찾기 위한 Map 생성
            Map<String, BidApiDto> dtoMap = new HashMap<>();
            for (BidApiDto dto : validDtos) {
                String realId = dto.getBidNtceNo() + "-" + dto.getBidNtceOrd();
                dtoMap.put(realId, dto);
            }

            List<String> realIdsToCheck = new ArrayList<>(dtoMap.keySet());
            List<Bid> existingBids = bidRepository.findByBidRealIdIn(realIdsToCheck);
            Set<String> existingIds = existingBids.stream().map(Bid::getBidRealId).collect(Collectors.toSet());

            // 중복되지 않은 새로운 Bid 엔티티 생성
            List<Bid> newBidsToSave = dtoMap.values().stream()
                    .filter(dto -> !existingIds.contains(dto.getBidNtceNo() + "-" + dto.getBidNtceOrd()))
                    .map(BidApiDto::toEntity)
                    .collect(Collectors.toList());

            // 3. 상세 정보 병합 Loop
            for (Bid bid : newBidsToSave) {
                try {
                    // (A) 지역 정보 병합
                    String permittedRegion = getPermittedRegion(bid.getBidRealId());
                    bid.setRegion(permittedRegion);

                    // (B) 기초금액 로직
                    BidPriceApiDto priceInfo = getBidPriceInfo(bid.getBidRealId());

                    if (priceInfo != null && !priceInfo.getBasicPrice().equals(java.math.BigInteger.ZERO)) {
                        bid.setBasicPrice(priceInfo.getBasicPrice());
                        double apiRange = priceInfo.getBidRangeAbs();
                        bid.setBidRange(apiRange == 0.0 ? 3.0 : apiRange);

                    } else {
                        if (bid.getEstimatePrice() != null) {
                            java.math.BigDecimal estPrice = new java.math.BigDecimal(bid.getEstimatePrice());
                            java.math.BigInteger calculatedBasicPrice = estPrice
                                    .multiply(java.math.BigDecimal.valueOf(1.1)).toBigInteger();
                            bid.setBasicPrice(calculatedBasicPrice);
                        }
                        bid.setBidRange(3.0);
                    }
                    Thread.sleep(50);
                } catch (Exception e) {
                    log.error("상세 정보 병합 중 에러 (ID: {}): {}", bid.getBidRealId(), e.getMessage());
                }
            }

            // 4. 최종 저장 및 후속 처리
            if (!newBidsToSave.isEmpty()) {
                List<Bid> savedBids = bidRepository.saveAll(newBidsToSave);

                int analysisCount = 0;
                int attachmentCount = 0;

                // 키워드 알림 처리
                try {
                    alarmService.processKeywordAlarms(savedBids);
                } catch (Exception e) {
                    log.error("알림 생성 중 오류: {}", e.getMessage());
                }

                for (Bid bid : savedBids) {
                    // [Step 1] AI 분석
                    try {
                        // analysisService.analyzeAndSave(bid.getBidId());
                        analysisCount++;
                    } catch (Exception e) {
                        log.warn("AI 분석 요청 실패 (ID: {}): {}", bid.getBidRealId(), e.getMessage());
                    }

                    // [Step 2] 첨부파일 저장
                    try {
                        BidApiDto sourceDto = dtoMap.get(bid.getBidRealId());

                        Map<String, String> fileMap = sourceDto.getAllFileMap();

                        // 1번부터 20번까지 싹 훑기
                        for (int i = 1; i <= 20; i++) {
                            String urlKey = "ntceSpecDocUrl" + i;
                            String nameKey = "ntceSpecFileNm" + i;

                            String fileUrl = fileMap.get(urlKey);
                            String fileName = fileMap.get(nameKey);

                            if (isValid(fileUrl)) {
                                if (!isValid(fileName))
                                    fileName = "공고문_" + i;
                                attachmentService.saveAttachmentInfoOnly(bid, fileName, fileUrl);
                                attachmentCount++;
                            }
                        }
                    } catch (Exception e) {
                        log.error("첨부파일 저장 실패 (ID: {}): {}", bid.getBidRealId(), e.getMessage());
                    }
                }
                return "신규 " + savedBids.size() + "건 저장 완료, " + analysisCount + "건 분석 요청, 첨부파일 연결 완료";
            }

            return "신규 데이터 없음";

        } catch (Exception e) {
            log.error("Error", e);
            return "에러: " + e.getMessage();
        }
    }

    // 참가가능지역 조회
    private String getPermittedRegion(String fullBidNtceNo) {
        String baseNo = fullBidNtceNo;
        String ord = "00";
        if (fullBidNtceNo.contains("-")) {
            String[] parts = fullBidNtceNo.split("-");
            baseNo = parts[0];
            if (parts.length > 1)
                ord = parts[1];
        }

        try {
            StringBuilder urlBuilder = new StringBuilder(
                    "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoPrtcptPsblRgn");
            urlBuilder.append("?" + URLEncoder.encode("serviceKey", "UTF-8") + "=" + SERVICE_KEY);
            urlBuilder.append("&" + URLEncoder.encode("pageNo", "UTF-8") + "=" + URLEncoder.encode("1", "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("numOfRows", "UTF-8") + "=" + URLEncoder.encode("10", "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("type", "UTF-8") + "=" + URLEncoder.encode("json", "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("bidNtceNo", "UTF-8") + "=" + URLEncoder.encode(baseNo, "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("bidNtceOrd", "UTF-8") + "=" + URLEncoder.encode(ord, "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("inqryDiv", "UTF-8") + "=" + URLEncoder.encode("2", "UTF-8"));
            URL url = new URI(urlBuilder.toString()).toURL();
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(url);
            JsonNode itemsNode = rootNode.path("response").path("body").path("items");

            if (itemsNode.isMissingNode() || itemsNode.isEmpty())
                return "전국";

            List<String> regions = new ArrayList<>();
            if (itemsNode.isArray()) {
                for (JsonNode item : itemsNode) {
                    if (item.has("prtcptPsblRgnNm"))
                        regions.add(item.get("prtcptPsblRgnNm").asText());
                }
            } else {
                if (itemsNode.has("item"))
                    regions.add(itemsNode.path("item").path("prtcptPsblRgnNm").asText());
            }

            if (regions.isEmpty())
                return "전국";
            return String.join(", ", regions);

        } catch (Exception e) {
            return "전국";
        }
    }

    // 기초금액/투찰범위 조회
    private BidPriceApiDto getBidPriceInfo(String fullBidNtceNo) {
        String baseNo = fullBidNtceNo;
        String ord = "00";
        if (fullBidNtceNo.contains("-")) {
            String[] parts = fullBidNtceNo.split("-");
            baseNo = parts[0];
            if (parts.length > 1)
                ord = parts[1];
        }

        try {
            StringBuilder urlBuilder = new StringBuilder(
                    "http://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwkBsisAmount");
            urlBuilder.append("?" + URLEncoder.encode("serviceKey", "UTF-8") + "=" + SERVICE_KEY);
            urlBuilder.append("&" + URLEncoder.encode("pageNo", "UTF-8") + "=" + URLEncoder.encode("1", "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("numOfRows", "UTF-8") + "=" + URLEncoder.encode("10", "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("type", "UTF-8") + "=" + URLEncoder.encode("json", "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("inqryDiv", "UTF-8") + "=" + URLEncoder.encode("2", "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("bidNtceNo", "UTF-8") + "=" + URLEncoder.encode(baseNo, "UTF-8"));
            urlBuilder.append("&" + URLEncoder.encode("bidNtceOrd", "UTF-8") + "=" + URLEncoder.encode(ord, "UTF-8"));

            URL url = new URI(urlBuilder.toString()).toURL();
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(url);
            JsonNode itemsNode = rootNode.path("response").path("body").path("items");

            if (itemsNode.isMissingNode() || itemsNode.isEmpty())
                return null;

            JsonNode targetNode;
            if (itemsNode.isArray()) {
                targetNode = itemsNode.get(0);
            } else {
                targetNode = itemsNode.path("item");
            }

            return mapper.treeToValue(targetNode, BidPriceApiDto.class);

        } catch (java.io.FileNotFoundException e) {
            return null;
        } catch (Exception e) {
            log.warn("기초금액 API 호출 실패 [ID: {}] : {}", fullBidNtceNo, e.toString());
            return null;
        }
    }

    @Transactional
    public void updateMissingData() {
        log.info("=== [데이터 보정] 누락된 기초금액/투찰범위 재수집 시작 ===");
        List<Bid> incompleteBids = bidRepository.findByEndDateAfterAndBidRange(LocalDateTime.now(), 0.0);
        int updateCount = 0;

        for (Bid bid : incompleteBids) {
            try {
                BidPriceApiDto priceInfo = getBidPriceInfo(bid.getBidRealId());
                if (priceInfo != null && !priceInfo.getBasicPrice().equals(java.math.BigInteger.ZERO)) {
                    bid.setBasicPrice(priceInfo.getBasicPrice());
                    bid.setBidRange(priceInfo.getBidRangeAbs());
                    updateCount++;
                    log.info("데이터 업데이트 성공 (ID: {})", bid.getBidRealId());
                }
                Thread.sleep(50);
            } catch (Exception e) {
                log.warn("보정 중 에러 (ID: {}): {}", bid.getBidRealId(), e.getMessage());
            }
        }
        log.info("=== [데이터 보정] 종료. 총 {}건 업데이트 완료 ===", updateCount);
    }

    private boolean isSkipTarget(BidApiDto dto) {
        String method = dto.getContractMethod();
        String title = dto.getName();

        if (method != null && method.contains("수의"))
            return true;
        if (title != null && (title.contains("시담") || title.contains("수의")))
            return true;

        return false;
    }

    private boolean isValid(String str) {
        return str != null && !str.trim().isEmpty() && !"null".equals(str);
    }
}