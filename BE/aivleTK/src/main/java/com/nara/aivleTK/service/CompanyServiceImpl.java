package com.nara.aivleTK.service;

import com.nara.aivleTK.domain.company.Company;
import com.nara.aivleTK.dto.company.CompanyRequest;
import com.nara.aivleTK.dto.company.CompanyResponse;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;

    // 회사 생성
    @Override
    @Transactional
    public CompanyResponse createCompany(CompanyRequest request) {
        // 이미 있는 회사명이어도 새로운 회사(새로운 로우)를 생성
        Company company = Company.builder()
                .name(request.getName())
                .position(request.getPosition())
                .build();
        return CompanyResponse.from(companyRepository.save(company));
    }

    // 회사 조회
    @Override
    public CompanyResponse getCompany(Integer id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("회사를 찾을 수 없습니다."));

        return CompanyResponse.from(company);
    }

    // 회사 목록 모두 조회
    @Override
    public List<CompanyResponse> getAllCompanies() {
        return companyRepository.findAll().stream().map(CompanyResponse::from).collect(Collectors.toList());
    }

    // 회사 정보 수정
    @Override
    @Transactional
    public CompanyResponse updateCompany(Integer id, String name, String position) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("회사를 찾을 수 없습니다."));
        company.setName(name);
        company.setPosition(position);
        return CompanyResponse.from(company);
    }
}