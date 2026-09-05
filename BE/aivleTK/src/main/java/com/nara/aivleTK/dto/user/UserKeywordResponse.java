package com.nara.aivleTK.dto.user;

import com.nara.aivleTK.domain.user.UserKeyword;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigInteger;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserKeywordResponse {
    private Integer id;
    private Integer userId;
    private String keyword;
    private BigInteger minPrice;
    private BigInteger maxPrice;

    public static UserKeywordResponse from(UserKeyword userKeyword) {
        return UserKeywordResponse.builder()
                .id(userKeyword.getId())
                .userId(userKeyword.getUser().getId())
                .keyword(userKeyword.getKeyword())
                .minPrice(userKeyword.getMinPrice())
                .maxPrice(userKeyword.getMaxPrice())
                .build();
    }
}
