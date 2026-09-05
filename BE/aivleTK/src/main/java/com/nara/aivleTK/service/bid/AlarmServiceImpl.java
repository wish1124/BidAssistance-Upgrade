package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.domain.Alarm;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.AlarmRepository;
import com.nara.aivleTK.repository.BidRepository;
import com.nara.aivleTK.domain.user.UserKeyword;
import com.nara.aivleTK.repository.UserKeywordRepository;
import com.nara.aivleTK.repository.UserRepository;
import com.nara.aivleTK.service.MailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlarmServiceImpl implements AlarmService {

    private final AlarmRepository alarmRepository;
    private final UserRepository userRepository;
    private final BidRepository bidRepository;
    private final MailService mailService;
    private final UserKeywordRepository userKeywordRepository;

    @Override
    @Transactional
    public void createAlarm(Integer userId, Integer bidId, String content, String alarmType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // bidId가 있을 경우에만 Bid 엔티티 조회 (null 허용)
        Bid bid = (bidId != null) ? bidRepository.findById(bidId).orElse(null) : null;

        Alarm alarm = Alarm.builder()
                .user(user)
                .bid(bid)
                .content(content)
                .alarmType(alarmType)
                .date(LocalDateTime.now()) // 알림 발생 시각 기록
                .build();
        alarmRepository.save(alarm);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Alarm> getMyAlarms(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        // 최신순 조회
        return alarmRepository.findByUserOrderByDateDesc(user);
    }

    @Override
    @Transactional
    public void deleteAlarm(Integer alarmId) {
        alarmRepository.deleteById(alarmId);
    }

    @Override
    public void sendEmailNotification(String email, String subject, String content) {
        mailService.sendAlarmNotification(email, subject, content);
    }

    @Override
    @Transactional
    public void processKeywordAlarms(List<Bid> newBids) {
        if (newBids == null || newBids.isEmpty())
            return;
        List<UserKeyword> keywords = userKeywordRepository.findAll();

        for (Bid bid : newBids) {
            String title = bid.getName() != null ? bid.getName() : "";
            java.math.BigInteger price = bid.getBasicPrice() != null ? bid.getBasicPrice() : java.math.BigInteger.ZERO;

            for (UserKeyword uk : keywords) {
                if (title.contains(uk.getKeyword())) {
                    // Price Check
                    if (uk.getMinPrice() != null && price.compareTo(uk.getMinPrice()) < 0)
                        continue;
                    if (uk.getMaxPrice() != null && price.compareTo(uk.getMaxPrice()) > 0)
                        continue;

                    createAlarm(uk.getUser().getId(), bid.getBidId(),
                            "키워드 알림 [" + uk.getKeyword() + "]: " + title, "KEYWORD");
                }
            }
        }
    }
}