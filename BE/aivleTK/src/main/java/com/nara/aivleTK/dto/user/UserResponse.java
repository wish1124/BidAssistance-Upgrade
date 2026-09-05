package com.nara.aivleTK.dto.user;

import com.nara.aivleTK.domain.user.User;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Integer id;
    private String email;
    private String name;
    private LocalDate birth;

    private Integer role;

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.birth = user.getBirth();

        this.role = user.getRole();
    }
}