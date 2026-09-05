package com.nara.aivleTK.service;

import com.nara.aivleTK.dto.company.CompanyRequest;
import com.nara.aivleTK.dto.company.CompanyResponse;

import java.util.List;

public interface CompanyService {
    CompanyResponse createCompany(CompanyRequest request);

    CompanyResponse getCompany(Integer id);

    List<CompanyResponse> getAllCompanies();

    CompanyResponse updateCompany(Integer id, String name, String position);
}
