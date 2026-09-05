package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.Attachment.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByBidBidId(int bidId);

    void deleteByBidBidId(Integer bidId);
}
