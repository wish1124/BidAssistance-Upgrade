package com.nara.aivleTK.controller;

import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.Wishlist;
import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.bid.BidResponse; // import 경로 수정
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.BidRepository;
import com.nara.aivleTK.repository.UserRepository;
import com.nara.aivleTK.repository.WishlistRepository;
import com.nara.aivleTK.service.bid.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.nara.aivleTK.util.JwtUtil;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {
    private final WishlistService wishlistService;
    private final JwtUtil jwtUtil;
    private final WishlistRepository wishlistRepository;
    private final BidRepository bidRepository;
    private final UserRepository userRepository;

    @PostMapping("/toggle")
    public ResponseEntity<ApiResponse<String>> toggleWishlist(@RequestParam Integer bidId,
            @CookieValue(value = JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {
        if (tokenValue == null) {
            throw new com.nara.aivleTK.exception.UnauthorizedException("로그인이 필요합니다.");
        }
        String token = jwtUtil.substringToken(tokenValue);
        if (!jwtUtil.validateToken(token)) {
            throw new com.nara.aivleTK.exception.UnauthorizedException("유효하지 않은 토큰입니다.");
        }
        int userId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);

        return ResponseEntity.ok(ApiResponse.success(wishlistService.toggleWishlist(userId, bidId)));
    }

    @GetMapping(value = { "", "/{userId:\\d+}" })
    public ResponseEntity<ApiResponse<List<BidResponse>>> getUserWishlist(
            @PathVariable(required = false) Integer userId,
            @CookieValue(value = JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {
        if (tokenValue == null) {
            throw new com.nara.aivleTK.exception.UnauthorizedException("로그인이 필요합니다.");
        }
        String token = jwtUtil.substringToken(tokenValue);
        if (!jwtUtil.validateToken(token)) {
            throw new com.nara.aivleTK.exception.UnauthorizedException("유효하지 않은 토큰입니다.");
        }
        int tokenUserId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);

        return ResponseEntity.ok(ApiResponse.success(wishlistService.getUserWishlist(tokenUserId)));
    }

    @PatchMapping("/stage/{userId:\\d+}/{bidId:\\d+}")
    public ResponseEntity<ApiResponse<String>> patchWish(
            @PathVariable Integer userId, @PathVariable Integer bidId,
            @RequestParam Integer stage) {
        User user = userRepository.findById(userId)
                .orElseThrow(()-> new ResourceNotFoundException("해당 유저를 찾을 수 없습니다."));
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(()-> new ResourceNotFoundException("공고를 찾을 수 없습니다."));
        Wishlist wl = wishlistRepository.findByUserAndBid(user, bid)
                .orElseThrow(()-> new ResourceNotFoundException("찜 목록을 찾을 수 없습니다."));
        wl.setStage(stage);
        wishlistRepository.save(wl);
        return ResponseEntity.ok(ApiResponse.success("스테이지 변경 완료"));
    }
}