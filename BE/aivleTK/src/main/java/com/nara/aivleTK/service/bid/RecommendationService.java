package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.BidLog;
import com.nara.aivleTK.domain.Wishlist;
import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.dto.bid.BidResponse;
import com.nara.aivleTK.repository.BidLogRepository;
import com.nara.aivleTK.repository.BidRepository;
import com.nara.aivleTK.repository.UserRepository;
import com.nara.aivleTK.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationService {

    private final BidRepository bidRepository;
    private final BidLogRepository bidLogRepository;
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;

    public List<BidResponse> getRecommendations(String userIdOrEmail) {
        return Collections.emptyList();
    }

    public List<BidResponse> getRecommendations(Integer userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return Collections.emptyList();
        }

        Set<String> regions = new HashSet<>();
        Set<String> organizations = new HashSet<>();

        List<BidLog> logs = bidLogRepository.findByUserOrderByDateDesc(user);
        for (BidLog log : logs) {
            if (log.getBid().getRegion() != null)
                regions.add(log.getBid().getRegion());
            if (log.getBid().getOrganization() != null)
                organizations.add(log.getBid().getOrganization());
            if (regions.size() > 10 && organizations.size() > 10)
                break;
        }

        // From Wishlist (Likes)
        List<Wishlist> wishes = wishlistRepository.findByUser(user);
        for (Wishlist wish : wishes) {
            if (wish.getBid().getRegion() != null)
                regions.add(wish.getBid().getRegion());
            if (wish.getBid().getOrganization() != null)
                organizations.add(wish.getBid().getOrganization());
        }

        if (regions.isEmpty() && organizations.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> regionList = new ArrayList<>(regions);
        List<String> orgList = new ArrayList<>(organizations);

        if (regionList.isEmpty())
            regionList.add("__DUMMY__");
        if (orgList.isEmpty())
            orgList.add("__DUMMY__");

        List<Bid> bids = bidRepository.findRecommendedBids(regionList, orgList, LocalDateTime.now());

        return bids.stream()
                .limit(20)
                .map(BidResponse::new)
                .collect(Collectors.toList());
    }
}
