package com.nara.aivleTK.dto.board;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BoardListRequest {
    private String category;
    private String q;
    private String sort;
    private Integer page;
    private Integer size;
}
