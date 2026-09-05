package com.nara.aivleTK.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nara.aivleTK.domain.Attachment.Attachment;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bid")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column
    private int bidId;
    @Column
    private String bidRealId;
    @Column
    private String name;

    @Column
    private LocalDateTime startDate;
    @Column(nullable = true)
    private LocalDateTime endDate;
    @Column
    private LocalDateTime openDate;
    @Column
    private LocalDateTime bidCreated;
    @Column
    private String region;
    @Column
    private String organization;
    @Column(name = "bid_URL")
    private String bidURL;
    @Column
    private BigInteger estimatePrice; // 추정가격
    @Column
    private BigInteger basicPrice; // 기초금액
    @Column
    private Double minimumBidRate; // 낙찰하한율
    @Column
    private Double bidRange; // 투찰범위 (새로 추가됨)
    @OneToMany(mappedBy = "bid", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<Attachment> attachments = new ArrayList<>();
}
