package com.nara.aivleTK.dto.board;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BoardRequest {
    private String title;
    private String content;
    private Integer userId;
    private String category;
    private List<Long> attachmentIds;
}
