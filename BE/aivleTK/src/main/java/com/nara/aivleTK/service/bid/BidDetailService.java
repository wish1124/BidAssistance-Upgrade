package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.domain.BidDetail;
import com.nara.aivleTK.dto.bid.BidDetailDto;

import java.util.Optional;

public interface BidDetailService {
    // BidDetail 생성 또는 업데이트
    BidDetail saveOrUpdate(Integer bidId, BidDetailDto dto);

    // Bid ID로 상세 정보 조회
    Optional<BidDetailDto> getByBidId(Integer bidId);

    // 존재 여부 확인
    boolean existsByBidId(Integer bidId);
}