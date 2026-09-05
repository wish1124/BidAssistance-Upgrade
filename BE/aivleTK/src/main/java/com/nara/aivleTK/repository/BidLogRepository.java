package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.BidLog;
import com.nara.aivleTK.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BidLogRepository extends JpaRepository<BidLog, Integer> {
    // 특정 사용자의 입찰 기록을 최신순으로 조회
    List<BidLog> findByUserOrderByDateDesc(User user);

    void deleteByBidBidId(Integer bidId);
}