package com.nara.aivleTK.service;

import com.nara.aivleTK.dto.board.BoardListItemResponse;
import com.nara.aivleTK.dto.board.BoardListRequest;
import com.nara.aivleTK.dto.board.BoardListResponse;
import com.nara.aivleTK.dto.board.BoardRequest;
import com.nara.aivleTK.dto.board.BoardResponse;

import java.util.List;

public interface BoardService {

    BoardResponse creatPost(BoardRequest br);

    BoardResponse getPost(Integer id);

    BoardResponse updatePost(Integer id, BoardRequest br, Integer userId);

    void deletePost(Integer id, Integer userId);

    BoardListResponse getBoardList(BoardListRequest blr, Integer userId);

    List<BoardListItemResponse> getTrendingPosts();
}