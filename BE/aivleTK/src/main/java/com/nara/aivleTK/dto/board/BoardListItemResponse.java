package com.nara.aivleTK.dto.board;

import com.nara.aivleTK.domain.board.Board;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class BoardListItemResponse {
    private Integer postId;
    private String title;
    private String contentPreview;
    private String category;
    private Integer authorId;
    private String authorName;
    private LocalDateTime createdAt;
    private Integer views;
    private Integer likes;
    private Boolean likedByMe;
    private Integer commentCount;
    private Integer attachmentCount;
    private Integer authorExpertLevel; // 작성자 등급 (1~5)
    private Integer adoptedCommentId; // 채택된 댓글 ID

    public static BoardListItemResponse from(Board board, Boolean likedByMe, Integer commentCount) {
        String preview = board.getContent();
        if (preview != null && preview.length() > 100) {
            preview = preview.substring(0, 100) + "...";
        }

        return BoardListItemResponse.builder()
                .postId(board.getId())
                .title(board.getTitle())
                .contentPreview(preview)
                .category(board.getCategory())
                .authorId(board.getUser().getId())
                .authorName(board.getUser().getName())
                .createdAt(board.getCreatedAt())
                .views(board.getViewCount())
                .likes(board.getLikeCount())
                .likedByMe(likedByMe)
                .commentCount(commentCount)
                .attachmentCount(board.getAttachments() != null ? board.getAttachments().size() : 0)
                .authorExpertLevel(board.getUser().getExpertLevel() != null ? board.getUser().getExpertLevel() : 1)
                .adoptedCommentId(board.getAdoptedCommentId())
                .build();
    }
}
