package com.team17.chatapp.chat.dto;

import com.team17.chatapp.chat.entity.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {

    private String fileName;
    private String originalFileName;
    private String fileUrl;
    private String contentType;
    private long fileSize;
    private MessageType messageType;
}
