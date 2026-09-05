package com.nara.aivleTK.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "bid_detail")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BidDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bid_detail_id")
    private Integer id;

    // Bid와 1:1 관계
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bid_id", nullable = false, unique = true)
    private Bid bid;

    // ========== 금액 관련 (9개) ==========
    @Column(name = "base_amount", precision = 20, scale = 2)
    private BigDecimal baseAmount; // 기초금액

    @Column(name = "estimated_price_range", precision = 10, scale = 4)
    private BigDecimal estimatedPriceRange; // 예가범위

    @Column(name = "estimated_price", precision = 20, scale = 2)
    private BigDecimal estimatedPrice; // 추정가격

    @Column(name = "min_bid_rate", precision = 10, scale = 4)
    private BigDecimal minBidRate; // 낙찰하한율

    @Column(name = "budget_to_estimate_ratio", precision = 10, scale = 4)
    private BigDecimal budgetToEstimateRatio; // 예산대비추정가

    @Column(name = "net_construction_cost", precision = 20, scale = 2)
    private BigDecimal netConstructionCost; // 순공사비

    @Column(name = "award_price", precision = 20, scale = 2)
    private BigDecimal awardPrice; // 낙찰가

    // ========== 비율/계수 (5개) ==========
    @Column(name = "difficulty_coefficient", precision = 10, scale = 4)
    private BigDecimal difficultyCoefficient; // 난이도계수

    @Column(name = "safety_management_fee_ratio", precision = 10, scale = 4)
    private BigDecimal safetyManagementFeeRatio; // 안전관리비비율

    @Column(name = "quality_management_fee_ratio", precision = 10, scale = 4)
    private BigDecimal qualityManagementFeeRatio; // 품질관리비비율

    @Column(name = "government_supplied_material_ratio", precision = 10, scale = 4)
    private BigDecimal governmentSuppliedMaterialRatio; // 관급비비중

    @Column(name = "vat_ratio", precision = 10, scale = 4)
    private BigDecimal vatRatio; // VAT비율

    // ========== 기간 (3개) ==========
    @Column(name = "bid_preparation_period")
    private Integer bidPreparationPeriod; // 입찰준비기간 (일)

    @Column(name = "announcement_to_opening_period")
    private Integer announcementToOpeningPeriod; // 공고개찰기간 (일)

    @Column(name = "qualification_registration_period")
    private Integer qualificationRegistrationPeriod; // 자격등록기간 (일)

    // ========== Boolean 플래그 (8개) ==========
    @Column(name = "regional_joint_contract_required")
    private Boolean regionalJointContractRequired; // 지역의무공동계약여부

    @Column(name = "difficulty_coefficient_applied")
    private Boolean difficultyCoefficientApplied; // 난이도계수_적용여부

    @Column(name = "safety_management_fee_applied")
    private Boolean safetyManagementFeeApplied; // 안전관리비_적용여부

    @Column(name = "quality_management_fee_applied")
    private Boolean qualityManagementFeeApplied; // 품질관리비_적용여부

    @Column(name = "government_supplied_material_applied")
    private Boolean governmentSuppliedMaterialApplied; // 관급비_적용여부

    @Column(name = "vat_applied")
    private Boolean vatApplied; // VAT_적용여부

    @Column(name = "seoul_metropolitan_area")
    private Boolean seoulMetropolitanArea; // 공사지역_광역_서울

    @Column(name = "net_construction_cost_missing")
    private Boolean netConstructionCostMissing; // 순공사비_결측여부
}