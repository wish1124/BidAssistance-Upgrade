package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.company.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Integer> {

    Optional<Company> findByName(String name);

}
