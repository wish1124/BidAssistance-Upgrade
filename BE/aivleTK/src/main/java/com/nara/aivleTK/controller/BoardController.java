package com.nara.aivleTK.controller;

import com.nara.aivleTK.domain.board.Board;
import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.board.*;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.exception.UnauthorizedException;
import com.nara.aivleTK.repository.BoardRepository;
import com.nara.aivleTK.service.BoardService;
import com.nara.aivleTK.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;

@RestController
@RequestMapping("/api/board")
@RequiredArgsConstructor
public class BoardController {
    private final BoardService boardService;
    private final BoardRepository boardRepository;
    private final JwtUtil jwtUtil;

    @PostMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<BoardResponse>> updatePost(@PathVariable Integer id, @RequestBody BoardRequest br,
            @CookieValue(value = JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {
        if (tokenValue == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        String token = jwtUtil.substringToken(tokenValue);
        if (!jwtUtil.validateToken(token)) {
            throw new UnauthorizedException("유효하지 않은 토큰입니다.");
        }
        int userId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);

        return ResponseEntity.ok(ApiResponse.success("게시글이 수정되었습니다.", boardService.updatePost(id, br, userId)));
    }

    @GetMapping("/{id:\\d+}") // 게시글 상세보기
    public ResponseEntity<ApiResponse<BoardResponse>> getPost(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getPost(id)));
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<Object>> deletePost(@PathVariable Integer id,
            @CookieValue(value = JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {
        if (tokenValue == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        String token = jwtUtil.substringToken(tokenValue);
        if (!jwtUtil.validateToken(token)) {
            throw new UnauthorizedException("유효하지 않은 토큰입니다.");
        }
        int userId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);

        boardService.deletePost(id, userId);

        return ResponseEntity.ok(ApiResponse.success("게시글이 삭제되었습니다."));
    }

    @PostMapping("/posts/{id:\\d+}/like") // 좋아요
    public ResponseEntity<ApiResponse<Object>> boardLike(@PathVariable Integer id) {
        Board board = boardRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        boardRepository.addLikeCount(id);

        return ResponseEntity.ok(ApiResponse.success("좋아요를 눌렀습니다."));
    }

    @PostMapping("/posts/{id:\\d+}/dislike") // 좋아요 취소
    public ResponseEntity<ApiResponse<Object>> boardDislike(@PathVariable Integer id) {
        Board board = boardRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        boardRepository.discardLikeCount(id);

        return ResponseEntity.ok(ApiResponse.success("좋아요를 취소했습니다."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BoardResponse>> createPost(@RequestBody BoardRequest br,
            @CookieValue(value = JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {
        if (tokenValue == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        String token = jwtUtil.substringToken(tokenValue);
        if (!jwtUtil.validateToken(token)) {
            throw new UnauthorizedException("유효하지 않은 토큰입니다.");
        }
        int userId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);
        br.setUserId(userId);

        return ResponseEntity.ok(ApiResponse.success("게시글이 작성되었습니다.", boardService.creatPost(br)));
    }

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<BoardListResponse>> boardList(@ModelAttribute BoardListRequest blr,
            @CookieValue(value = JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {
        Integer userId = null;
        if (tokenValue != null) {
            try {
                String token = jwtUtil.substringToken(tokenValue);
                if (jwtUtil.validateToken(token)) {
                    userId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);
                }
            } catch (Exception e) {
                throw new ResourceNotFoundException("게시글을 불러올 수 없습니다.");
            }
        }

        return ResponseEntity.ok(ApiResponse.success("게시글 목록입니다.", boardService.getBoardList(blr, userId)));
    }

    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<java.util.List<BoardListItemResponse>>> getTrendingPosts() {
        return ResponseEntity.ok(ApiResponse.success("인기 게시글입니다.", boardService.getTrendingPosts()));
    }
}
