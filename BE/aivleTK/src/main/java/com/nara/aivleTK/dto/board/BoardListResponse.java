package com.nara.aivleTK.dto.board;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class BoardListResponse {
    private List<BoardListItemResponse> items;
    private Integer page;
    private Integer size;
    private Long total;
    private CategoryCountsResponse counts;
}
