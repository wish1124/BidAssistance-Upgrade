package com.nara.aivleTK.service;

import com.nara.aivleTK.dto.comment.CommentCreateRequest;
import com.nara.aivleTK.dto.comment.CommentResponse;

import java.util.List;

public interface CommentService {
    // null 넣으려면 Integer 써야함
    CommentResponse createComment(Integer bidId, Integer boardId, CommentCreateRequest request);

    void deleteComment(int commentId, int userId);

    List<CommentResponse> getCommentsByBid(int bidId);

    List<CommentResponse> getCommentsByBoard(int boardId);

    CommentResponse adoptComment(int commentId, int userId);
}
