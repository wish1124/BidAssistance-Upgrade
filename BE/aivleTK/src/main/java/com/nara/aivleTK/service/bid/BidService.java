package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.dto.bid.BidResponse;
import java.util.List;

public interface BidService {
    List<BidResponse> searchBid(String name, String region, String organization);

    // 나중에 투찰 마감시간이 지난 공고는 제외 할 수 있도록 변경
    List<BidResponse> getAllBid();

    BidResponse getBidById(int id);

    List<BidResponse> getBidsByIds(List<Integer> ids);

    void deleteBid(Integer id, Integer userId);
}
