package com.nara.aivleTK.dto.user;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ResetPasswordRequest {
    private String email;
    private String name;
    private String answer;
    private LocalDate birth;
}
