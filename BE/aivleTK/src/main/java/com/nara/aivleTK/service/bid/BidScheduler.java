package com.nara.aivleTK.service.bid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BidScheduler {
    private final BidApiService bidApiService;

    @Value("${app.bid.fetch.on-startup:false}")
    private boolean fetchOnStartup;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        if (fetchOnStartup) {
            log.info("=== [서버 시작] 공고 데이터 수집 자동 시작 (설정값: true) ===");
            try {
                bidApiService.fetchAndSaveBidData();
            } catch (Exception e) {
                log.error("서버 시작 시 수집 중 오류: ", e);
            }
        }
    }

    @Scheduled(cron = "${app.bid.fetch.schedule:0 0 0 * * *}")
    public void autoFetch() {
        log.info("스케쥴러 실행");
        try {
            String result = bidApiService.fetchAndSaveBidData();
            log.info("스케쥴러 종료 결과 : {}", result);
        } catch (Exception e) {
            log.error("오류 발생", e);
        }
    }

    @Scheduled(cron = "0 0 4 * * *") // 매일 새벽 4시 보정 (이건 고정해둠)
    public void scheduleUpdate() {
        bidApiService.updateMissingData();
    }
}
