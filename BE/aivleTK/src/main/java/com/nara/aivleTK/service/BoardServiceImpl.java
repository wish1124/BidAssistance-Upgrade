package com.nara.aivleTK.service;

import com.nara.aivleTK.domain.Attachment.Attachment;
import com.nara.aivleTK.domain.board.Board;
import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.dto.board.BoardListRequest;
import com.nara.aivleTK.dto.board.BoardListResponse;
import com.nara.aivleTK.dto.board.BoardRequest;
import com.nara.aivleTK.dto.board.BoardResponse;
import com.nara.aivleTK.dto.board.BoardListItemResponse;
import com.nara.aivleTK.dto.board.CategoryCountsResponse;
import com.nara.aivleTK.repository.AttachmentRepository;
import com.nara.aivleTK.repository.BoardRepository;
import com.nara.aivleTK.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardServiceImpl implements BoardService {

    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;

    @Transactional // 게시글 생성
    public BoardResponse creatPost(BoardRequest br) {
        User user = userRepository.findById(br.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Board board = Board.builder()
                .title(br.getTitle()).content(br.getContent())
                .user(user).category(br.getCategory())
                .likeCount(0).viewCount(0).build();

        Board savedBoard = boardRepository.save(board);

        // 첨부 업로드
        if (br.getAttachmentIds() != null && !br.getAttachmentIds().isEmpty()) {
            List<Attachment> attachments = attachmentRepository.findAllById(br.getAttachmentIds());

            for (Attachment attachment : attachments) {
                attachment.setBoard(savedBoard);
            }
        }

        return BoardResponse.from(savedBoard);
    }

    @Transactional // 게시글 불러오기
    public BoardResponse getPost(Integer id) {
        boardRepository.updateViewCount(id);
        Board board = boardRepository.findById(id).orElseThrow();

        return BoardResponse.from(board);
    }

    @Transactional // 게시글 업데이트
    public BoardResponse updatePost(Integer id, BoardRequest br, Integer userId) {
        Board board = boardRepository.findById(id).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        if ((!board.getUser().getId().equals(userId)) && (user.getRole() != 2)) {
            throw new IllegalStateException("수정 권한이 없습니다.");
        }

        board.setTitle(br.getTitle());
        board.setCategory(br.getCategory());
        board.setContent(br.getContent());

        return BoardResponse.from(boardRepository.save(board));
    }

    @Transactional // 게시글 삭제
    public void deletePost(Integer id, Integer userId) {
        Board board = boardRepository.findById(id).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        if ((!board.getUser().getId().equals(userId)) && (user.getRole() != 2)) { // 관리자가 아니거나 작성자가 아니거나
            throw new IllegalStateException("삭제 권한이 없습니다.");
        }
        boardRepository.delete(board);
    }

    @Override
    @Transactional(readOnly = true)
    public BoardListResponse getBoardList(BoardListRequest blr, Integer userId) {
        int page = ((blr.getPage() != null) && (blr.getPage() > 0)) ? blr.getPage() - 1 : 0;
        int size = (blr.getSize() != null) ? blr.getSize() : 10;

        Sort sort = Sort.by("createdAt").descending();
        if ("popular".equals(blr.getSort())) {
            sort = Sort.by("likeCount").descending();
        } else if ("views".equals(blr.getSort())) {
            sort = Sort.by("viewCount").descending();
        } else if ("comments".equals(blr.getSort())) {
            sort = Sort.by("commentCount").descending();
        }

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Board> boardPage = boardRepository.search(blr, pageable);

        List<BoardListItemResponse> items = boardPage.getContent().stream()
                .map(board -> {
                    return BoardListItemResponse.from(board, false,
                            board.getCommentCount() != null ? board.getCommentCount().intValue() : 0);
                })
                .collect(Collectors.toList());

        CategoryCountsResponse counts = boardRepository.getCategoryCounts();

        return BoardListResponse.builder()
                .items(items)
                .page(page + 1)
                .size(size)
                .total(boardPage.getTotalElements())
                .counts(counts)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BoardListItemResponse> getTrendingPosts() {
        // 최근 30일 내 게시글만 대상으로 함
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusDays(30);

        List<Board> recentBoards = boardRepository.findAllByCreatedAtAfter(cutoff);

        // 시간 가중치 적용 점수 계산
        java.time.LocalDate today = java.time.LocalDate.now();

        return recentBoards.stream()
                .map(board -> {
                    long daysSincePosted = java.time.temporal.ChronoUnit.DAYS.between(
                            board.getCreatedAt().toLocalDate(), today);
                    double decayFactor = Math.pow(0.7, daysSincePosted);
                    double score = (board.getLikeCount() != null ? board.getLikeCount() : 0) * decayFactor;

                    return new Object[] { board, score };
                })
                .sorted((a, b) -> Double.compare((Double) b[1], (Double) a[1]))
                .limit(3)
                .map(arr -> {
                    Board board = (Board) arr[0];
                    return BoardListItemResponse.builder()
                            .postId(board.getId())
                            .title(board.getTitle())
                            .contentPreview(board.getContent() != null && board.getContent().length() > 100
                                    ? board.getContent().substring(0, 100) + "..."
                                    : board.getContent())
                            .category(board.getCategory())
                            .authorId(board.getUser().getId())
                            .authorName(board.getUser().getName())
                            .createdAt(board.getCreatedAt())
                            .views(board.getViewCount())
                            .likes(board.getLikeCount())
                            .likedByMe(false)
                            .commentCount(board.getCommentCount() != null ? board.getCommentCount().intValue() : 0)
                            .attachmentCount(board.getAttachments() != null ? board.getAttachments().size() : 0)
                            .authorExpertLevel(
                                    board.getUser().getExpertLevel() != null ? board.getUser().getExpertLevel() : 1)
                            .adoptedCommentId(board.getAdoptedCommentId())
                            .build();
                })
                .collect(Collectors.toList());
    }
}