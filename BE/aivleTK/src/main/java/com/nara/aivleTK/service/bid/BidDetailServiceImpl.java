package com.nara.aivleTK.service.bid;

import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.BidDetail;
import com.nara.aivleTK.dto.bid.BidDetailDto;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.BidDetailRepository;
import com.nara.aivleTK.repository.BidRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BidDetailServiceImpl implements BidDetailService {

    private final BidDetailRepository bidDetailRepository;
    private final BidRepository bidRepository;

    @Override
    @Transactional
    public BidDetail saveOrUpdate(Integer bidId, BidDetailDto dto) {
        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new ResourceNotFoundException("Bid not found with id: " + bidId));

        // 기존 BidDetail이 있으면 업데이트, 없으면 생성
        BidDetail bidDetail = bidDetailRepository.findByBidBidId(bidId)
                .orElse(BidDetail.builder().bid(bid).build());

        // DTO -> Entity 매핑
        bidDetail.setBaseAmount(dto.getBaseAmount());
        bidDetail.setEstimatedPriceRange(dto.getEstimatedPriceRange());
        bidDetail.setEstimatedPrice(dto.getEstimatedPrice());
        bidDetail.setMinBidRate(dto.getMinBidRate());
        bidDetail.setBudgetToEstimateRatio(dto.getBudgetToEstimateRatio());
        bidDetail.setNetConstructionCost(dto.getNetConstructionCost());
        bidDetail.setAwardPrice(dto.getAwardPrice());

        bidDetail.setDifficultyCoefficient(dto.getDifficultyCoefficient());
        bidDetail.setSafetyManagementFeeRatio(dto.getSafetyManagementFeeRatio());
        bidDetail.setQualityManagementFeeRatio(dto.getQualityManagementFeeRatio());
        bidDetail.setGovernmentSuppliedMaterialRatio(dto.getGovernmentSuppliedMaterialRatio());
        bidDetail.setVatRatio(dto.getVatRatio());

        bidDetail.setBidPreparationPeriod(dto.getBidPreparationPeriod());
        bidDetail.setAnnouncementToOpeningPeriod(dto.getAnnouncementToOpeningPeriod());
        bidDetail.setQualificationRegistrationPeriod(dto.getQualificationRegistrationPeriod());

        bidDetail.setRegionalJointContractRequired(dto.getRegionalJointContractRequired());
        bidDetail.setDifficultyCoefficientApplied(dto.getDifficultyCoefficientApplied());
        bidDetail.setSafetyManagementFeeApplied(dto.getSafetyManagementFeeApplied());
        bidDetail.setQualityManagementFeeApplied(dto.getQualityManagementFeeApplied());
        bidDetail.setGovernmentSuppliedMaterialApplied(dto.getGovernmentSuppliedMaterialApplied());
        bidDetail.setVatApplied(dto.getVatApplied());
        bidDetail.setSeoulMetropolitanArea(dto.getSeoulMetropolitanArea());
        bidDetail.setNetConstructionCostMissing(dto.getNetConstructionCostMissing());

        return bidDetailRepository.save(bidDetail);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BidDetailDto> getByBidId(Integer bidId) {
        return bidDetailRepository.findByBidBidId(bidId)
                .map(BidDetailDto::from);
    }

    @Override
    public boolean existsByBidId(Integer bidId) {
        return bidDetailRepository.existsByBidBidId(bidId);
    }
}