package com.team17.chatapp.chat.controller;

import com.team17.chatapp.chat.dto.FileUploadResponse;
import com.team17.chatapp.chat.service.FileStorageService;
import com.team17.chatapp.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<FileUploadResponse>> uploadFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) {
        String baseUrl;
        try {
            baseUrl = ServletUriComponentsBuilder.fromRequestUri(request)
                    .replacePath(null)
                    .build()
                    .toUriString();
        } catch (Exception e) {
            baseUrl = "http://localhost:8080";
        }

        FileUploadResponse response = fileStorageService.storeFile(file, baseUrl);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tải tệp lên thành công", response));
    }

    @GetMapping("/{fileName:.+}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable("fileName") String fileName,
            @RequestParam(value = "download", defaultValue = "false") boolean download
    ) {
        Resource resource = fileStorageService.loadFileAsResource(fileName);
        String contentType = fileStorageService.determineContentType(fileName);

        String disposition = download || !contentType.startsWith("image/")
                ? "attachment; filename=\"" + resource.getFilename() + "\""
                : "inline; filename=\"" + resource.getFilename() + "\"";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .body(resource);
    }
}
