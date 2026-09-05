package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.Alarm;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlarmRepository extends JpaRepository<Alarm, Integer> {
    // 특정 사용자의 알림을 최신순으로 조회
    List<Alarm> findByUserOrderByDateDesc(User user);

    // 특정 공고(Bid)와 관련된 알림 삭제 시 사용
    void deleteByBid(Bid bid);

    void deleteByBidBidId(Integer bidId);
}