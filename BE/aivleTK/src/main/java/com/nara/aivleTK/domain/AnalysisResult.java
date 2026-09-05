package com.nara.aivleTK.domain;

import com.nara.aivleTK.domain.Attachment.Attachment;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Table(name = "analysis_result")

public class AnalysisResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer analysisResultId;
    @OneToOne
    @JoinColumn(name = "bid_id")
    private Bid bid;
    @Column(precision = 10, scale = 4)
    private BigDecimal goldenRate;
    private Long predictedPrice;
    @Column(precision = 10, scale = 4)
    private BigDecimal avgRate;
    private LocalDateTime analysisDate;
    @Column(length = 10000)
    private String analysisContent;
    @Column(length = 500)
    private String pdfUrl;
    @Column(length = 500)
    private String contractMethod;
    @Column(length = 500)
    private String trackRecord;
    @Column(length = 500)
    private String qualification;
}
