package com.nara.aivleTK.dto.comment;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.nara.aivleTK.domain.Comment;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CommentResponse {
    private int commentId;
    private String content;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Seoul")
    private LocalDateTime commentCreatedAt;
    private Integer userId;
    private String userName;
    private Integer bidId;
    private Integer parentCommentId;
    private Integer boardId;
    private Boolean isAdopted; // 채택 여부
    private Integer userExpertLevel; // 작성자 등급 (1~5)

    public CommentResponse(Comment comment) {
        this.commentId = comment.getCommentId();
        this.content = comment.getCommentContent();
        this.commentCreatedAt = comment.getCommentCreateAt();
        if (comment.getUser() != null) {
            this.userId = comment.getUser().getId();
            this.userName = comment.getUser().getName();
        }
        if (comment.getBid() != null) {
            this.bidId = comment.getBid().getBidId();
        }
        if (comment.getBoard() != null) {
            this.boardId = comment.getBoard().getId();
        }
        if (comment.getParent() != null) {
            this.parentCommentId = comment.getParent().getCommentId();
        }
        this.isAdopted = comment.getIsAdopted() != null ? comment.getIsAdopted() : false;
        if (comment.getUser() != null) {
            this.userExpertLevel = comment.getUser().getExpertLevel() != null ? comment.getUser().getExpertLevel() : 1;
        } else {
            this.userExpertLevel = 1;
        }
    }
}
