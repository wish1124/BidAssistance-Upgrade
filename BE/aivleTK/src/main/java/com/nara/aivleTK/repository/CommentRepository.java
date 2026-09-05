package com.nara.aivleTK.repository;


import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.Comment;
import com.nara.aivleTK.domain.board.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Integer> {
    List<Comment> findByBid(Bid bid);
    List<Comment> findByBidBidIdOrderByCommentCreateAtAsc(Integer bidId);
    List<Comment> findByBoard(Board board);
    List<Comment> findAllByBid_BidId(int bidId);
    // Board ID로 댓글 찾기
    List<Comment> findAllByBoard_Id(int boardId);
}
