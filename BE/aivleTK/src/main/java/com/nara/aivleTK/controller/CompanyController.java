package com.nara.aivleTK.controller;

import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.company.CompanyRequest;
import com.nara.aivleTK.dto.company.CompanyResponse;
import com.nara.aivleTK.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {
    private final CompanyService companyService;

    @PostMapping // 회사 생성
    public ResponseEntity<ApiResponse<CompanyResponse>> createCompany(@RequestBody CompanyRequest cr) {
        CompanyResponse company = companyService.createCompany(cr);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("회사가 등록되었습니다.", company));
    }

    @GetMapping // 회사 전체 조회
    public ResponseEntity<ApiResponse<List<CompanyResponse>>> getALLCompanies() {
        List<CompanyResponse> list = companyService.getAllCompanies();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id:\\d+}") // 회사 상세 조회
    public ResponseEntity<ApiResponse<CompanyResponse>> getCompany(@PathVariable("id") Integer id) {
        CompanyResponse company = companyService.getCompany(id);
        return ResponseEntity.ok(ApiResponse.success(company));
    }

    @PutMapping("/{id:\\d+}") // 회사 정보 수정
    public ResponseEntity<ApiResponse<CompanyResponse>> updateCompany(@PathVariable("id") Integer id,
            @RequestBody CompanyRequest cr) {
        CompanyResponse company = companyService.updateCompany(id, cr.getName(), cr.getPosition());
        return ResponseEntity.ok(ApiResponse.success("회사 정보가 수정되었습니다.", company));
    }

}