package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.Bid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Integer> {

        boolean existsByBidRealId(String realId);

        @Query("SELECT b FROM Bid b WHERE " +
                        "(b.name LIKE %:name% OR b.organization LIKE %:organization% OR b.region LIKE %:region%) " +
                        "AND b.name NOT LIKE '[취소공고]%' " +
                        "AND b.endDate > CURRENT_TIMESTAMP " +
                        "ORDER BY b.bidCreated DESC")
        List<Bid> searchBasic(@Param("name") String name, @Param("organization") String organization,
                        @Param("region") String region);

        // Python 검색 툴 필터 적용 + 마감 임박순 정렬 쿼리
        @Query("SELECT b FROM Bid b WHERE " +
                        "(:bidRealId IS NULL OR b.bidRealId = :bidRealId) " +
                        "AND (:keyword IS NULL OR b.name LIKE %:keyword%) " +
                        "AND (:region IS NULL OR b.region LIKE %:region%) " +
                        "AND (:organization IS NULL OR b.organization LIKE %:organization%) " +
                        "AND (:minBasicPrice IS NULL OR b.basicPrice >= :minBasicPrice) " +
                        "AND (:maxBasicPrice IS NULL OR b.basicPrice <= :maxBasicPrice) " +
                        "AND (:minEstimatePrice IS NULL OR b.estimatePrice >= :minEstimatePrice) " +
                        "AND (:maxEstimatePrice IS NULL OR b.estimatePrice <= :maxEstimatePrice) " +
                        "AND (:minBidRate IS NULL OR b.minimumBidRate >= :minBidRate) " +
                        "AND (:maxBidRate IS NULL OR b.minimumBidRate <= :maxBidRate) " +
                        "AND (:minBidRange IS NULL OR b.bidRange >= :minBidRange) " +
                        "AND (:maxBidRange IS NULL OR b.bidRange <= :maxBidRange) " +
                        "AND (:startDateFrom IS NULL OR b.startDate >= :startDateFrom) " +
                        "AND (:startDateTo IS NULL OR b.startDate <= :startDateTo) " +
                        "AND (:endDateFrom IS NULL OR b.endDate >= :endDateFrom) " +
                        "AND (:endDateTo IS NULL OR b.endDate <= :endDateTo) " +
                        "AND (:openDateFrom IS NULL OR b.openDate >= :openDateFrom) " +
                        "AND (:openDateTo IS NULL OR b.openDate <= :openDateTo) " +
                        "AND (b.endDate > :now) " +
                        "AND b.name NOT LIKE '[취소공고]%'")
        Page<Bid> searchDetail(
                        @Param("bidRealId") String bidRealId,
                        @Param("keyword") String keyword,
                        @Param("region") String region,
                        @Param("organization") String organization,
                        @Param("minBasicPrice") Long minPrice,
                        @Param("maxBasicPrice") Long maxPrice,
                        @Param("minEstimatePrice") Long minEstimatePrice,
                        @Param("maxEstimatePrice") Long maxEstimatePrice,
                        @Param("minBidRate") Double minBidRate,
                        @Param("maxBidRate") Double maxBidRate,
                        @Param("minBidRange") Double minBidRange,
                        @Param("maxBidRange") Double maxBidRange,
                        @Param("startDateFrom") LocalDateTime startDateFrom,
                        @Param("startDateTo") LocalDateTime startDateTo,
                        @Param("endDateFrom") LocalDateTime endDateFrom,
                        @Param("endDateTo") LocalDateTime endDateTo,
                        @Param("openDateFrom") LocalDateTime openDateFrom,
                        @Param("openDateTo") LocalDateTime openDateTo,
                        @Param("now") LocalDateTime now,
                        Pageable pageable);

        @Query("SELECT b FROM Bid b WHERE (b.region IN :regions OR b.organization IN :organizations) AND b.endDate > :now AND b.name NOT LIKE '[취소공고]%' ORDER BY b.bidCreated DESC")

        List<Bid> findRecommendedBids(@Param("regions") List<String> regions,
                        @Param("organizations") List<String> organizations, @Param("now") LocalDateTime now);

        List<Bid> findByBidRealIdIn(List<String> realIds);

        List<Bid> findTop200ByRegionIsNull();

        List<Bid> findByEndDateAfterAndBidRange(LocalDateTime now, Double bidRange);

        @Query("SELECT b FROM Bid b WHERE b.endDate > :now AND b.name NOT LIKE '[취소공고]%' ORDER BY b.bidCreated DESC")
        List<Bid> findByEndDateAfter(@Param("now") LocalDateTime now);
}