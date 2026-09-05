package com.nara.aivleTK.domain;

import com.nara.aivleTK.domain.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bid_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BidLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bid_log_id")
    private Integer id; // ERD: INT

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // 입찰한 사용자

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bid_id", nullable = false)
    private Bid bid; // 입찰 대상 공고

    @Column(nullable = false)
    private LocalDateTime date; // 입찰 일시

}