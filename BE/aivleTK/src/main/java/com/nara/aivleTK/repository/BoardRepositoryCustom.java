package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.board.Board;
import com.nara.aivleTK.dto.board.BoardListRequest;
import com.nara.aivleTK.dto.board.CategoryCountsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BoardRepositoryCustom {
    Page<Board> search(BoardListRequest blr, Pageable pageable);

    CategoryCountsResponse getCategoryCounts();
}
