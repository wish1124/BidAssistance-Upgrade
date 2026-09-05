package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.dto.bid.BidResponse; // .bid 추가됨
import java.util.List;

public interface WishlistService {
    String toggleWishlist(Integer userId, Integer bidId);
    List<BidResponse> getUserWishlist(Integer userId);
}