package com.nara.aivleTK.domain;

import com.nara.aivleTK.domain.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alarm")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alarm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alarm_id")
    private Integer id; // ERD: INT

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // 알림을 받는 사용자

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bid_id")
    private Bid bid; // 관련 입찰 공고 (null 가능할 수도 있음)

    @Column(name = "alarm_content", length = 100, nullable = false)
    private String content; // 알림 내용

    @Column(name = "alarm_type", length = 20, nullable = false)
    private String alarmType; // 알림 유형 (KEYWORD, SYSTEM 등)

    @Column(name = "alarm_date")
    private LocalDateTime date; // 알림 생성 일시: TIMESTAMP(1)
}