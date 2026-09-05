package com.nara.aivleTK.dto.bid;

import com.nara.aivleTK.domain.BidDetail;
import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BidDetailDto {
    // 금액 관련
    private BigDecimal baseAmount;
    private BigDecimal estimatedPriceRange;
    private BigDecimal estimatedPrice;
    private BigDecimal minBidRate;
    private BigDecimal budgetToEstimateRatio;
    private BigDecimal netConstructionCost;
    private BigDecimal awardPrice;

    // 비율/계수
    private BigDecimal difficultyCoefficient;
    private BigDecimal safetyManagementFeeRatio;
    private BigDecimal qualityManagementFeeRatio;
    private BigDecimal governmentSuppliedMaterialRatio;
    private BigDecimal vatRatio;

    // 기간
    private Integer bidPreparationPeriod;
    private Integer announcementToOpeningPeriod;
    private Integer qualificationRegistrationPeriod;

    // Boolean 플래그
    private Boolean regionalJointContractRequired;
    private Boolean difficultyCoefficientApplied;
    private Boolean safetyManagementFeeApplied;
    private Boolean qualityManagementFeeApplied;
    private Boolean governmentSuppliedMaterialApplied;
    private Boolean vatApplied;
    private Boolean seoulMetropolitanArea;
    private Boolean netConstructionCostMissing;

    // Entity -> DTO 변환
    public static BidDetailDto from(BidDetail entity) {
        if (entity == null) return null;

        return BidDetailDto.builder()
                .baseAmount(entity.getBaseAmount())
                .estimatedPriceRange(entity.getEstimatedPriceRange())
                .estimatedPrice(entity.getEstimatedPrice())
                .minBidRate(entity.getMinBidRate())
                .budgetToEstimateRatio(entity.getBudgetToEstimateRatio())
                .netConstructionCost(entity.getNetConstructionCost())
                .awardPrice(entity.getAwardPrice())
                .difficultyCoefficient(entity.getDifficultyCoefficient())
                .safetyManagementFeeRatio(entity.getSafetyManagementFeeRatio())
                .qualityManagementFeeRatio(entity.getQualityManagementFeeRatio())
                .governmentSuppliedMaterialRatio(entity.getGovernmentSuppliedMaterialRatio())
                .vatRatio(entity.getVatRatio())
                .bidPreparationPeriod(entity.getBidPreparationPeriod())
                .announcementToOpeningPeriod(entity.getAnnouncementToOpeningPeriod())
                .qualificationRegistrationPeriod(entity.getQualificationRegistrationPeriod())
                .regionalJointContractRequired(entity.getRegionalJointContractRequired())
                .difficultyCoefficientApplied(entity.getDifficultyCoefficientApplied())
                .safetyManagementFeeApplied(entity.getSafetyManagementFeeApplied())
                .qualityManagementFeeApplied(entity.getQualityManagementFeeApplied())
                .governmentSuppliedMaterialApplied(entity.getGovernmentSuppliedMaterialApplied())
                .vatApplied(entity.getVatApplied())
                .seoulMetropolitanArea(entity.getSeoulMetropolitanArea())
                .netConstructionCostMissing(entity.getNetConstructionCostMissing())
                .build();
    }
}