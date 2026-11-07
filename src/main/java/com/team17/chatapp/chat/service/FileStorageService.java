package com.team17.chatapp.chat.service;

import com.team17.chatapp.chat.dto.FileUploadResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    FileUploadResponse storeFile(MultipartFile file, String baseUrl);

    Resource loadFileAsResource(String fileName);

    String determineContentType(String fileName);
}
