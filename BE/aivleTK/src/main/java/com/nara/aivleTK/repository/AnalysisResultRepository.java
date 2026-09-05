package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.AnalysisResult;
import com.nara.aivleTK.domain.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Integer> {
    Optional<AnalysisResult> findByBidBidId(Integer bidId);

    Optional<AnalysisResult> findByBid(Bid bid);

    void deleteByBidBidId(Integer bidId);
}
