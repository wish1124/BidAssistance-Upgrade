package com.nara.aivleTK.dto.chatBot;

import com.nara.aivleTK.domain.Bid;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class ChatResponse {
    private String message;       // AI의 말 (텍스트)
    private String type;          // "text" 또는 "list" 구분
    private Object data;       // 실제 검색 결과 데이터 (옵션)

    // 생성자 오버로딩 (텍스트만 보낼 때)
    public ChatResponse(String message) {
        this.message = message;
        this.type = "text";
        this.data = null;
    }
}