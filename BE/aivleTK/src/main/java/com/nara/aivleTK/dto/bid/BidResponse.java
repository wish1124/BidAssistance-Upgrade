package com.nara.aivleTK.dto.bid;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nara.aivleTK.domain.Attachment.Attachment;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.dto.AnalysisResultDto;
import com.nara.aivleTK.dto.board.AttachmentResponse;
import lombok.*;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@NoArgsConstructor
@Setter
@Builder
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BidResponse {
    private int id;
    private String realId;
    private String name;
    private Integer stage;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private LocalDateTime openDate;
    private LocalDateTime bidCreated;
    private String region;
    private String organization;
    private String bidURL;
    private String bidReportURL;
    private BigInteger estimatePrice;
    private BigInteger basicPrice;
    private Double bidRange;
    private Double minimumBidRate;
    private AnalysisResultDto analysisResult;
    private BidDetailDto bidDetail;
    private List<AttachmentResponse> attachments;

    public BidResponse(Bid bid) {
        this.id = bid.getBidId();
        this.realId = bid.getBidRealId();
        this.name = bid.getName();
        this.stage = null;
        this.startDate = bid.getStartDate();
        this.endDate = bid.getEndDate();
        this.openDate = bid.getOpenDate();
        this.bidCreated = bid.getBidCreated();
        this.region = bid.getRegion();
        this.organization = bid.getOrganization();
        this.bidURL = bid.getBidURL();
        this.estimatePrice = bid.getEstimatePrice();
        this.basicPrice = bid.getBasicPrice();
        this.bidRange = bid.getBidRange();
        this.minimumBidRate = bid.getMinimumBidRate();
        this.attachments = bid.getAttachments().stream()
                .map(AttachmentResponse::from)
                .collect(Collectors.toList());
    }

    public BidResponse(Bid bid, Integer stage) {
        this.id = bid.getBidId();
        this.realId = bid.getBidRealId();
        this.name = bid.getName();
        this.stage = stage;
        this.startDate = bid.getStartDate();
        this.endDate = bid.getEndDate();
        this.openDate = bid.getOpenDate();
        this.bidCreated = bid.getBidCreated();
        this.region = bid.getRegion();
        this.organization = bid.getOrganization();
        this.bidURL = bid.getBidURL();
        this.estimatePrice = bid.getEstimatePrice();
        this.basicPrice = bid.getBasicPrice();
        this.bidRange = bid.getBidRange();
        this.minimumBidRate = bid.getMinimumBidRate();
        this.attachments = bid.getAttachments().stream()
                .map(AttachmentResponse::from)
                .collect(Collectors.toList());
    }

    public static BidResponse from(Bid bid) {
        return new BidResponse(bid);
    }
}
