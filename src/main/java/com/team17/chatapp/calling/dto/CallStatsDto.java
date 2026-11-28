package com.team17.chatapp.calling.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallStatsDto {

    private long totalCalls;
    private long completedCalls;
    private long missedCalls;
    private long rejectedCalls;
    private long groupCalls;
    private long totalDurationSeconds;
}
