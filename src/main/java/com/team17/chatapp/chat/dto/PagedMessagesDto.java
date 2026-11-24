package com.team17.chatapp.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedMessagesDto {

    private List<MessageDto> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasMore;
}
