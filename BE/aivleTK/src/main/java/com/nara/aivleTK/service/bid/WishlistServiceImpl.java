package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.Wishlist;
import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.dto.bid.BidResponse; // import 경로 수정
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.BidRepository;
import com.nara.aivleTK.repository.UserRepository;
import com.nara.aivleTK.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {
    private final WishlistRepository wishlistRepository;
    private final BidRepository bidRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public String toggleWishlist(Integer userId, Integer bidId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new ResourceNotFoundException("Bid not found"));

        Optional<Wishlist> wishlistOpt = wishlistRepository.findByUserAndBid(user, bid);

        if (wishlistOpt.isPresent()) {
            wishlistRepository.delete(wishlistOpt.get());
            return "찜하기가 취소되었습니다.";
        } else {
            wishlistRepository.save(Wishlist.builder().user(user).bid(bid).stage(0).build());
            return "찜 목록에 추가되었습니다.";
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<BidResponse> getUserWishlist(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return wishlistRepository.findByUser(user).stream()
                .map(wishlist -> new BidResponse(wishlist.getBid(), wishlist.getStage()))
                .collect(Collectors.toList());
    }
}