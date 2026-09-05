package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.Wishlist;
import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.domain.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Integer> {
    List<Wishlist> findByUser(User user);

    Optional<Wishlist> findByUserAndBid(User user, Bid bid);

    void deleteByBidBidId(Integer bidId);
}