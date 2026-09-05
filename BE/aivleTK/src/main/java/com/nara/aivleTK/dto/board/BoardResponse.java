package com.nara.aivleTK.dto.board;

import com.nara.aivleTK.domain.board.Board;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@AllArgsConstructor
public class BoardResponse {
        private Integer id;
        private String title;
        private Integer authorId;
        private String userName;
        private String content;
        private String category;
        private Integer likeCount;
        private Integer viewCount;
        private Long commentCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<AttachmentResponse> attachments;
        private Integer authorExpertLevel;
        private Integer adoptedCommentId;

        public static BoardResponse from(Board board) {
                List<AttachmentResponse> attachmentResponses = board.getAttachments() != null
                                ? board.getAttachments().stream()
                                                .map(AttachmentResponse::from)
                                                .collect(Collectors.toList())
                                : List.of();

                Integer expertLevel = 1;
                if (board.getUser() != null && board.getUser().getExpertLevel() != null) {
                        expertLevel = board.getUser().getExpertLevel();
                }

                return BoardResponse.builder()
                                .id(board.getId())
                                .title(board.getTitle())
                                .authorId(board.getUser() != null ? board.getUser().getId() : null)
                                .userName(board.getUser() != null ? board.getUser().getName() : null)
                                .content(board.getContent())
                                .category(board.getCategory())
                                .likeCount(board.getLikeCount())
                                .viewCount(board.getViewCount())
                                .commentCount(board.getCommentCount())
                                .createdAt(board.getCreatedAt())
                                .updatedAt(board.getUpdatedAt())
                                .attachments(attachmentResponses)
                                .authorExpertLevel(expertLevel)
                                .adoptedCommentId(board.getAdoptedCommentId())
                                .build();
        }

        public BoardResponse(Board board) {
                this.id = board.getId();
                this.title = board.getTitle();
                this.authorId = board.getUser() != null ? board.getUser().getId() : null;
                this.userName = board.getUser() != null ? board.getUser().getName() : null;
                this.category = board.getCategory();
                this.createdAt = board.getCreatedAt();
                this.content = board.getContent();
                this.likeCount = board.getLikeCount();
                this.viewCount = board.getViewCount();
                this.commentCount = board.getCommentCount();
                this.createdAt = board.getCreatedAt();
                this.updatedAt = board.getUpdatedAt();
                this.attachments = board.getAttachments() != null
                                ? board.getAttachments().stream()
                                                .map(AttachmentResponse::from)
                                                .collect(Collectors.toList())
                                : List.of();
                this.authorExpertLevel = (board.getUser() != null && board.getUser().getExpertLevel() != null)
                                ? board.getUser().getExpertLevel()
                                : 1;
                this.adoptedCommentId = board.getAdoptedCommentId();
        }
}
