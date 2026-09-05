package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.domain.BidLog;
import java.util.List;

public interface BidLogService {
    void logView(Integer userId, Integer bidId); // 공고 조회 기록 저장

    List<BidLog> getUserBidLogs(Integer userId); // 유저별 조회 내역 조회
}