package com.nara.aivleTK.controller;

import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.domain.user.UserKeyword;
import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.user.UserKeywordResponse;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.UserKeywordRepository;
import com.nara.aivleTK.repository.UserRepository;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.util.List;

@RestController
@RequestMapping("/api/keywords")
@RequiredArgsConstructor
public class UserKeywordController {

    private final UserKeywordRepository userKeywordRepository;
    private final UserRepository userRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<List<UserKeywordResponse>>> getUserKeywords(@PathVariable Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<UserKeywordResponse> list = userKeywordRepository.findByUser(user).stream()
                .map(UserKeywordResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<String>> addKeyword(@RequestBody KeywordRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserKeyword keyword = UserKeyword.builder()
                .user(user)
                .keyword(request.getKeyword())
                .minPrice(request.getMinPrice())
                .maxPrice(request.getMaxPrice())
                .build();

        userKeywordRepository.save(keyword);
        return ResponseEntity.ok(ApiResponse.success("키워드가 추가되었습니다."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteKeyword(@PathVariable Integer id) {
        userKeywordRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("키워드가 삭제되었습니다."));
    }

    @Getter
    @NoArgsConstructor
    public static class KeywordRequest {
        private Integer userId;
        private String keyword;
        private BigInteger minPrice;
        private BigInteger maxPrice;
    }
}
