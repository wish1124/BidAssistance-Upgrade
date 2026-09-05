package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.board.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface BoardRepository extends JpaRepository<Board, Integer>, BoardRepositoryCustom {

    @Modifying
    @Transactional
    @Query("update Board b set b.viewCount = b.viewCount+1 where b.id =:id")
    void updateViewCount(@Param("id") Integer id);

    @Modifying
    @Transactional
    @Query("update Board b set b.likeCount = b.likeCount+1 where b.id =:id")
    void addLikeCount(@Param("id") Integer id);

    @Modifying
    @Transactional
    @Query("update Board b set b.likeCount = b.likeCount-1 where b.id =:id")
    void discardLikeCount(@Param("id") Integer id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "user" })
    java.util.List<Board> findAllByCreatedAtAfter(java.time.LocalDateTime createdAt);
}
