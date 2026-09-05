package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.BidLog;
import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.BidLogRepository;
import com.nara.aivleTK.repository.BidRepository;
import com.nara.aivleTK.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BidLogServiceImpl implements BidLogService {
        private final BidLogRepository bidLogRepository;
        private final UserRepository userRepository;
        private final BidRepository bidRepository;

        @Override
        @Transactional
        public void logView(Integer userId, Integer bidId) { // 공고 조회 기록
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

                Bid bid = bidRepository.findById(bidId)
                                .orElseThrow(() -> new ResourceNotFoundException("Bid not found"));


                BidLog log = BidLog.builder()
                                .user(user)
                                .bid(bid)
                                // .price(price) removed
                                .date(LocalDateTime.now())
                                .build();
                bidLogRepository.save(log);
        }

        @Override
        @Transactional(readOnly = true)
        public List<BidLog> getUserBidLogs(Integer userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                return bidLogRepository.findByUserOrderByDateDesc(user);
        }
}