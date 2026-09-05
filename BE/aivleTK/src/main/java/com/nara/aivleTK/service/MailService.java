package com.nara.aivleTK.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    public void sendTemporaryPassword(String email, String password) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("임시 비밀번호 발급");
        message.setText("요청하신 임시 비밀번호는 [" + password + "] 입니다." +
                "로그인 후 비밀번호를 변경해 주세요.");
        mailSender.send(message);
    }

    // 알림 이메일 발송 메서드
    public void sendAlarmNotification(String email, String subject, String content) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject(subject);
        message.setText(content);
        mailSender.send(message);
    }
}