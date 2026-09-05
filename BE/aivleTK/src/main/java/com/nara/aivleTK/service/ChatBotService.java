package com.nara.aivleTK.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nara.aivleTK.config.ChatbotClient;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.dto.chatBot.BidChatDto;
import com.nara.aivleTK.dto.chatBot.ChatResponse;
import com.nara.aivleTK.dto.chatBot.PythonChatRequest;
import com.nara.aivleTK.repository.BidRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigInteger;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatBotService {

    private final BidRepository bidRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // 파이썬 서버 주소
    private final String PYTHON_URL = "https://aivleachatbot.greenpond-9eab36ab.koreacentral.azurecontainerapps.io/chat";
    private final ChatbotClient chatBotClient;

    public ChatResponse getChatResponse(PythonChatRequest reqFromClient) {
        // DTO에 payload 필드가 없으므로, 현재는 query만 보냅니다.
        // 추후 요약 기능을 위해서는 PythonChatRequest DTO에 payload 필드 추가가 필요합니다.
        String prompt = reqFromClient.getQuery();
        String threadId = (reqFromClient.getThread_id() == null || reqFromClient.getThread_id().isBlank())
                ? "user_session_1"
                : reqFromClient.getThread_id();

        HttpHeaders headers = new HttpHeaders();
        headers.add("ngrok-skip-browser-warning", "true");
        headers.add("Content-Type", "application/json");

        if (reqFromClient.getThread_id() == null || reqFromClient.getThread_id().isBlank()) {
            reqFromClient.setThread_id("user_session_1");
        }
        if (reqFromClient.getType() == null || reqFromClient.getType().isBlank()) {
            reqFromClient.setType("query");
        }
// 2. 들어온 객체를 그대로 전달 (payload 포함됨)
        HttpEntity<PythonChatRequest> entity = new HttpEntity<>(reqFromClient, headers);

        try {
            ResponseEntity<Map> responseEntity = restTemplate.postForEntity(PYTHON_URL, entity, Map.class);
            Map<String, Object> body = responseEntity.getBody();

            if (body == null || !body.containsKey("response")) {
                return new ChatResponse("AI 서버로부터 응답이 없습니다.");
            }

            String respType = String.valueOf(body.get("type"));      // Python이 내려주는 타입
            String respText = String.valueOf(body.get("response"));  // 실제 내용

            // ★ 1. 마크다운 제거 (안정성 강화)
            if ("search".equals(respType)) {
                // 검색조건 JSON 문자열일 확률이 매우 높음
                String sanitized = sanitizeAiResponse(respText); // 백틱 제거용으로만 남겨도 됨
                return handleSearchIntent(sanitized, prompt, threadId); // (너가 이미 만든 시그니처 기준)
            }
            if ("summary".equals(respType) || "chat".equals(respType)) {
                return new ChatResponse(respText);
            }
            return new ChatResponse(respText);

        } catch (Exception e) {
            log.error("AI 서버 연결 실패: {}", e.getMessage());
            return new ChatResponse("시스템 에러: " + e.getMessage());
        }
    }

    // ★ 마크다운 제거 메서드
    private String sanitizeAiResponse(String content) {
        if (content == null) return "";
        String sanitized = content.trim();
        if (sanitized.startsWith("```json")) {
            sanitized = sanitized.substring(7);
        } else if (sanitized.startsWith("```")) {
            sanitized = sanitized.substring(3);
        }
        if (sanitized.endsWith("```")) {
            sanitized = sanitized.substring(0, sanitized.length() - 3);
        }
        return sanitized.trim();
    }

    // 의도 파악 조건 수정
    private boolean isSearchIntent(String response) {
        try {
            JsonNode node = objectMapper.readTree(response);
            // Python 툴은 intent 키를 주지 않고 filter와 output을 줍니다.
            return node.has("filter") && node.has("output");
        } catch (Exception e) {
            return false;
        }
    }

    private ChatResponse handleSearchIntent(String jsonString, String originalPrompt, String threadId) {
        try {
            int limit = 3;
            var pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.ASC, "endDate"));

            JsonNode root = objectMapper.readTree(jsonString);
            JsonNode filter = root.path("filter");

            String bidRealId = filter.path("bidRealId").isNull() ? null : filter.path("bidRealId").asText();
            String region = filter.path("region").isNull() ? null : filter.path("region").asText();
            String organization = filter.path("organization").isNull() ? null : filter.path("organization").asText();
            String keyword = null; // Python 툴에는 keyword 필드가 없으므로 null (필요시 name 사용)

            Long minBasicPrice = parseLongValue(filter.path("basicPrice"), "from");
            Long maxBasicPrice = parseLongValue(filter.path("basicPrice"), "to");

            Long minEstimatePrice = parseLongValue(filter.path("estimatePrice"), "from");
            Long maxEstimatePrice = parseLongValue(filter.path("estimatePrice"), "to");

            Double minBidRate = parseDoubleValue(filter.path("minimumBidRate"), "from");
            Double maxBidRate = parseDoubleValue(filter.path("minimumBidRate"), "to");

            Double minBidRange = parseDoubleValue(filter.path("bidRange"), "from");
            Double maxBidRange = parseDoubleValue(filter.path("bidRange"), "to");

            // 날짜 조건 처리
            LocalDateTime startDateFrom = null; LocalDateTime startDateTo = null;
            LocalDateTime endDateFrom = null; LocalDateTime endDateTo = null;
            LocalDateTime openDateFrom = null; LocalDateTime openDateTo = null;

            JsonNode timeRange = filter.path("timeRange");
            if (!timeRange.isMissingNode() && !timeRange.isNull()) {
                String base = timeRange.path("base").asText();

                LocalDateTime fromDate = parseDateValue(timeRange.path("from"));
                LocalDateTime toDate = parseDateValue(timeRange.path("to"));

                if ("startDate".equals(base)) {
                    startDateFrom = fromDate; startDateTo = toDate;
                } else if ("endDate".equals(base)) {
                    endDateFrom = fromDate; endDateTo = toDate;
                } else if ("openDate".equals(base)) {
                    openDateFrom = fromDate; openDateTo = toDate;
                }
            }

            List<Bid> searchResults = bidRepository.searchDetail(
                    bidRealId, keyword, region, organization,
                    minBasicPrice, maxBasicPrice,
                    minEstimatePrice, maxEstimatePrice,
                    minBidRate, maxBidRate,
                    minBidRange, maxBidRange,
                    startDateFrom, startDateTo,
                    endDateFrom, endDateTo,
                    openDateFrom, openDateTo,
                    LocalDateTime.now(),
                    pageable
            ).getContent();

            if (searchResults.isEmpty()) {
                return new ChatResponse("조건에 맞는 공고가 없습니다.");
            }

            // 엔티티 -> DTO 변환
            List<BidChatDto> dtoList = searchResults.stream()
                    .map(this::toBidChatDto)
                    .toList();

            // postprocess도 DTO로 전달
            String summary = callPythonPostprocess(originalPrompt, threadId, dtoList);

            // 응답 data도 DTO로 내려줌
            return new ChatResponse(summary, "list", dtoList);

        } catch (Exception e) {
            log.error("검색 처리 중 오류", e);
            return new ChatResponse("검색 조건을 처리하는 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private Long parseLongValue(JsonNode parentNode, String direction) {
        if (parentNode.isMissingNode() || parentNode.isNull()) return null;
        JsonNode target = parentNode.path(direction);
        if (target.has("value") && !target.path("value").isNull()) {
            return target.path("value").asLong();
        }
        return null;
    }

    private Double parseDoubleValue(JsonNode parentNode, String direction) {
        if (parentNode.isMissingNode() || parentNode.isNull()) return null;
        JsonNode target = parentNode.path(direction);
        if (target.has("value") && !target.path("value").isNull()) {
            return target.path("value").asDouble();
        }
        return null;
    }

    private LocalDateTime parseDateValue(JsonNode node) {
        if (node.isMissingNode() || node.isNull()) return null;

        String kind = node.path("kind").asText();

        if ("absolute".equals(kind)) {
            long val = node.path("value").asLong();
            if (val == 0) return null;
            try {
                String dateStr = String.valueOf(val);
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmm");
                return LocalDateTime.parse(dateStr, formatter);
            } catch (Exception e) {
                log.warn("절대 날짜 파싱 실패: " + val);
                return null;
            }
        }
        // 3. 상대 날짜(calendar) 처리 로직 추가
        else if ("calendar".equals(kind)) {
            String unit = node.path("unit").asText();
            int offset = node.path("offset").asInt();
            String position = node.path("position").asText();
            return calculateCalendarDate(unit, offset, position);
        }
        return null;
    }

    // 상대 날짜 계산 헬퍼 메서드 추가
    private LocalDateTime calculateCalendarDate(String unit, int offset, String position) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime targetDate = now;

        // 1. 오프셋 적용
        switch (unit) {
            case "day": targetDate = now.plusDays(offset); break;
            case "week": targetDate = now.plusWeeks(offset); break;
            case "month": targetDate = now.plusMonths(offset); break;
            case "year": targetDate = now.plusYears(offset); break;
        }

        // 2. 위치(start/end) 보정
        if ("start".equals(position)) {
            switch (unit) {
                case "week": targetDate = targetDate.with(DayOfWeek.MONDAY).withHour(0).withMinute(0).withSecond(0); break;
                case "month": targetDate = targetDate.with(TemporalAdjusters.firstDayOfMonth()).withHour(0).withMinute(0).withSecond(0); break;
                case "year": targetDate = targetDate.with(TemporalAdjusters.firstDayOfYear()).withHour(0).withMinute(0).withSecond(0); break;
                case "day": targetDate = targetDate.withHour(0).withMinute(0).withSecond(0); break;
            }
        } else if ("end".equals(position)) {
            switch (unit) {
                case "week": targetDate = targetDate.with(DayOfWeek.SUNDAY).withHour(23).withMinute(59).withSecond(59); break;
                case "month": targetDate = targetDate.with(TemporalAdjusters.lastDayOfMonth()).withHour(23).withMinute(59).withSecond(59); break;
                case "year": targetDate = targetDate.with(TemporalAdjusters.lastDayOfYear()).withHour(23).withMinute(59).withSecond(59); break;
                case "day": targetDate = targetDate.withHour(23).withMinute(59).withSecond(59); break;
            }
        }
        return targetDate;
    }
    private String callPythonPostprocess(String originalPrompt, String threadId, List<BidChatDto>  searchResults) {
        try {
            // Bid -> Map 요약 변환 (필요한 필드만)
            List<Map<String, Object>> results = searchResults.stream().map(b -> {
                Map<String, Object> m = new HashMap<>();
                m.put("bidRealId", b.getBidRealId());
                m.put("name", b.getName());
                m.put("region", b.getRegion());
                m.put("organization", b.getOrganization());
                m.put("startDate", b.getStartDate());
                m.put("endDate", b.getEndDate());
                m.put("openDate", b.getOpenDate());
                m.put("attachments", b.getAttachments());
                return m;
            }).toList();

            Map<String, Object> payload = new HashMap<>();
            payload.put("query", originalPrompt);
            payload.put("count", results.size());
            payload.put("results", results);
            PythonChatRequest req = PythonChatRequest.builder()
                    .type("notice_result")     // query가 아닌 다른 타입이면 main.py가 payload json으로 넣어줌
                    .query("")
                    .payload(payload)
                    .thread_id(threadId)
                    .build();

            HttpHeaders headers = new HttpHeaders();
            headers.add("ngrok-skip-browser-warning", "true");
            headers.add("Content-Type", "application/json");
            HttpEntity<PythonChatRequest> entity = new HttpEntity<>(req, headers);

            ResponseEntity<Map> responseEntity = restTemplate.postForEntity(PYTHON_URL, entity, Map.class);
            Map<String, Object> body = responseEntity.getBody();

            if (body == null || !body.containsKey("response")) {
                return "검색 결과 " + searchResults.size() + "건을 찾았습니다.";
            }

            return String.valueOf(body.get("response"));

        } catch (Exception e) {
            log.warn("postprocess 호출 실패: {}", e.getMessage());
            return "검색 결과 " + searchResults.size() + "건을 찾았습니다.";
        }
    }
    private BidChatDto toBidChatDto(Bid b) {
        return new BidChatDto(
                b.getBidRealId(),
                b.getName(),
                b.getRegion(),
                b.getOrganization(),
                b.getStartDate(),
                b.getEndDate(),
                b.getOpenDate(),
                bigIntToLongSafe(b.getEstimatePrice()),
                bigIntToLongSafe(b.getBasicPrice()),
                b.getMinimumBidRate(),
                b.getBidRange(),
                b.getAttachments()
        );
    }

    private Long bigIntToLongSafe(BigInteger v) {
        if (v == null) return null;
        try {
            return v.longValueExact();
        } catch (ArithmeticException e) {
            // Long 범위 초과 대비
            return v.longValue();
        }
    }
    public ChatResponse getFileResponse(String text, MultipartFile file) {
        try{
            String aiResult = chatBotClient.sendFileAndText(text, file);
            return new ChatResponse(aiResult);
        }catch (Exception e){
            log.error("에러발생",e);
            return  new ChatResponse(e.getMessage());
        }
    }
}