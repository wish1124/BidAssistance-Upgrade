package com.nara.aivleTK.dto.alarm;

import com.nara.aivleTK.domain.Alarm;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlarmResponse {

    private Integer alarmId;
    private Integer userId;
    private Integer bidId;
    private String bidName;
    private String content;
    private String alarmType;
    private LocalDateTime date;

    public static AlarmResponse from(Alarm alarm) {
        return AlarmResponse.builder()
                .alarmId(alarm.getId())
                .userId(alarm.getUser() != null ? alarm.getUser().getId() : null)
                .bidId(alarm.getBid() != null ? alarm.getBid().getBidId() : null)
                .bidName(alarm.getBid() != null ? alarm.getBid().getName() : null)
                .content(alarm.getContent())
                .alarmType(alarm.getAlarmType())
                .date(alarm.getDate())
                .build();
    }
}
