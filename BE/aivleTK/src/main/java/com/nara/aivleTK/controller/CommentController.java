package com.nara.aivleTK.controller;

import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.comment.CommentCreateRequest;
import com.nara.aivleTK.dto.comment.CommentResponse;
import com.nara.aivleTK.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class CommentController {
    private final CommentService commentService;

    @PostMapping("/bids/{bidId:\\d+}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> createBidComment(
            @PathVariable("bidId") int bidId,
            @RequestBody CommentCreateRequest request) {
        CommentResponse response = commentService.createComment(bidId, null, request);
        return ResponseEntity.ok(ApiResponse.success("댓글이 작성되었습니다.", response));
    }

    @GetMapping("/bids/{bidId:\\d+}/comments")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getCommentsByBid(
            @PathVariable("bidId") int bidId) {
        List<CommentResponse> comments = commentService.getCommentsByBid(bidId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    @PostMapping("/boards/{boardId:\\d+}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> createBoardComment(
            @PathVariable("boardId") int boardId,
            @RequestBody CommentCreateRequest request) {
        CommentResponse response = commentService.createComment(null, boardId, request);
        return ResponseEntity.ok(ApiResponse.success("댓글이 작성되었습니다.", response));
    }

    @GetMapping("/boards/{boardId:\\d+}/comments")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getCommentsByBoard(
            @PathVariable("boardId") int boardId) {
        // 서비스에 Board용 조회 메서드 필요 (ex: findAllByBoard_Id)
        List<CommentResponse> comments = commentService.getCommentsByBoard(boardId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    @DeleteMapping("/comments/{commentId:\\d+}")
    public ResponseEntity<ApiResponse<Object>> deleteComment(
            @PathVariable int commentId,
            @RequestParam("userId") int userId) {
        commentService.deleteComment(commentId, userId);
        return ResponseEntity.ok(ApiResponse.success("댓글이 삭제되었습니다."));
    }

    @PutMapping("/comments/{commentId:\\d+}/adopt")
    public ResponseEntity<ApiResponse<CommentResponse>> adoptComment(
            @PathVariable int commentId,
            @RequestParam("userId") int userId) {
        CommentResponse response = commentService.adoptComment(commentId, userId);
        return ResponseEntity.ok(ApiResponse.success("답변이 채택되었습니다.", response));
    }
}
