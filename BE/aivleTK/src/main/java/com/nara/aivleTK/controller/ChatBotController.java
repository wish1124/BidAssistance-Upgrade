package com.nara.aivleTK.controller;

import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.chatBot.ChatResponse;
import com.nara.aivleTK.dto.chatBot.PythonChatRequest;
import com.nara.aivleTK.service.ChatBotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/chatbots")
@RequiredArgsConstructor
public class ChatBotController {
    private final ChatBotService chatBotService;

    @PostMapping
    public ResponseEntity<ApiResponse<ChatResponse>> chat(@RequestBody PythonChatRequest request){
        ChatResponse response = chatBotService.getChatResponse(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    @PostMapping(value = "/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatResponse>> chatWithFile(
            @RequestPart(value = "text") String text,
            @RequestPart(value = "file", required = false) MultipartFile file
    ) {
        ChatResponse response = chatBotService.getFileResponse(text, file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
