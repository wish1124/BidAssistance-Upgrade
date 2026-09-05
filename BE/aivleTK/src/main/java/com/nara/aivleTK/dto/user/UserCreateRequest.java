package com.nara.aivleTK.dto.user;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UserCreateRequest {
    private String email;
    private String password;
    private String name;
    private Integer question;
    private String answer;
    private Integer role;
    private LocalDate birth;

}
