package com.nara.aivleTK.dto.chatBot;

import com.nara.aivleTK.domain.Attachment.Attachment;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BidChatDto {

    private String bidRealId;
    private String name;
    private String region;
    private String organization;

    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private LocalDateTime openDate;

    private Long basicPrice;
    private Long estimatePrice;
    private Double minimumBidRate;
    private Double bidRange;
    private List<Attachment> attachments;

}
