package com.nara.aivleTK.dto.chatBot;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nara.aivleTK.domain.Bid;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PythonChatRequest {
        @JsonProperty("type")
        private String type;
        @JsonProperty("query")
        private String query;
        @JsonProperty("payload")
        private Object payload;
        @JsonProperty("thread_id")
        private String thread_id;

        // 편의용 생성자 (질문만 보낼 때)
        public PythonChatRequest(String query, String thread_id) {
            this.type = "query";
            this.query = query;
            this.thread_id = thread_id;
            this.payload = null;
        }
    }

