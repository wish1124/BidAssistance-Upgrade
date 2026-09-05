package com.nara.aivleTK.controller;

import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.bid.BidResponse;
import com.nara.aivleTK.service.bid.BidService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids")
@RequiredArgsConstructor
public class BidController {
    private final BidService bidService;
    private final com.nara.aivleTK.service.bid.RecommendationService recommendationService;
    private final com.nara.aivleTK.service.bid.BidLogService bidLogService;
    private final com.nara.aivleTK.util.JwtUtil jwtUtil;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BidResponse>>> getBids(
            @RequestParam(name = "name", required = false) String name,
            @RequestParam(name = "region", required = false) String region,
            @RequestParam(name = "organization", required = false) String organization) {
        List<BidResponse> bids = (isBlank(name) && isBlank(region) && isBlank(organization))
                ? bidService.getAllBid()
                : bidService.searchBid(name, region, organization);

        return ResponseEntity.ok(ApiResponse.success(bids));
    }

    @GetMapping("/batch")
    public ResponseEntity<ApiResponse<List<BidResponse>>> getBidsBatch(@RequestParam List<Integer> ids) {
        List<BidResponse> bids = bidService.getBidsByIds(ids);
        return ResponseEntity.ok(ApiResponse.success(bids));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<ApiResponse<List<BidResponse>>> getRecommendations(@RequestParam Integer userId) {
        List<BidResponse> list = recommendationService.getRecommendations(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/{id}/log")
    public ResponseEntity<ApiResponse<Void>> logBidView(@PathVariable Integer id, @RequestParam Integer userId) {
        bidLogService.logView(userId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<BidResponse>>> getBidHistory(@RequestParam Integer userId) {
        List<BidResponse> history = bidLogService.getUserBidLogs(userId).stream()
                .map(log -> BidResponse.from(log.getBid()))
                .distinct() // 중복 제거 (여러 번 조회했어도 한번만)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    @GetMapping("/{bidId:\\d+}")
    public ResponseEntity<ApiResponse<BidResponse>> detailBids(@PathVariable int bidId) {
        BidResponse response = bidService.getBidById(bidId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<Object>> deleteBid(@PathVariable Integer id,
            @CookieValue(value = com.nara.aivleTK.util.JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {

        if (tokenValue == null) {
            throw new com.nara.aivleTK.exception.UnauthorizedException("로그인이 필요합니다.");
        }
        String token = jwtUtil.substringToken(tokenValue);
        if (!jwtUtil.validateToken(token)) {
            throw new com.nara.aivleTK.exception.UnauthorizedException("유효하지 않은 토큰입니다.");
        }
        int userId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);

        bidService.deleteBid(id, userId);

        return ResponseEntity.ok(ApiResponse.success("공고가 삭제되었습니다."));
    }
}
