package com.nara.aivleTK.domain.company;

import com.nara.aivleTK.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "company")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "company_id")
    private Integer id;

    @Column(length = 50, nullable = false)
    private String name;

    // 직책 (대표, 팀장, 사원 등)
    @Column(name = "position", length = 50)
    private String position;

    // 양방향 매핑 with User
    @Builder.Default
    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<User> users = new ArrayList<>();
}
