package com.nara.aivleTK.dto.board;

import com.nara.aivleTK.domain.Attachment.Attachment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AttachmentResponse {
    private Long id;
    private String fileName;
    private String url;

    public static AttachmentResponse from(Attachment attachment) {
        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .url(attachment.getUrl())
                .build();
    }
}
