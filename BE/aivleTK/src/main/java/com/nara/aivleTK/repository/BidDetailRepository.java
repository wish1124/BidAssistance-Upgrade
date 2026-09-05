package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.BidDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BidDetailRepository extends JpaRepository<BidDetail, Integer> {
    // Bid ID로 상세 정보 조회
    Optional<BidDetail> findByBidBidId(Integer bidId);

    // Bid ID로 존재 여부 확인
    boolean existsByBidBidId(Integer bidId);

    void deleteByBidBidId(Integer bidId);
}