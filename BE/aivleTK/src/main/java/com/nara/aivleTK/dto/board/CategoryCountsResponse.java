package com.nara.aivleTK.dto.board;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class CategoryCountsResponse {
    private Long all;
    private Long question;
    private Long info;
    private Long review;
    private Long discussion;
}
