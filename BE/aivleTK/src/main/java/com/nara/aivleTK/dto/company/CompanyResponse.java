package com.nara.aivleTK.dto.company;

import com.nara.aivleTK.domain.company.Company;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyResponse {
    private Integer id;
    private String name;
    private String position; // 직책

    public static CompanyResponse from(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .position(company.getPosition())
                .build();
    }
}
