package com.nara.aivleTK.dto.company;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyRequest {
    private String name;
    private String position; // 직책
}
