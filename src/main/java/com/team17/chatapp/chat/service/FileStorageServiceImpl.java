package com.team17.chatapp.chat.service;

import com.team17.chatapp.chat.dto.FileUploadResponse;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.exception.AppException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageServiceImpl implements FileStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024L; // 25MB
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp", "svg", "bmp");

    private final Path fileStorageLocation;

    public FileStorageServiceImpl(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            log.error("Không thể khởi tạo thư mục lưu trữ file upload", ex);
        }
    }

    @Override
    public FileUploadResponse storeFile(MultipartFile file, String baseUrl) {
        if (file == null || file.isEmpty()) {
            throw new AppException("Tệp tải lên không được để trống", HttpStatus.BAD_REQUEST);
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new AppException("Kích thước tệp vượt quá giới hạn cho phép (25MB)", HttpStatus.BAD_REQUEST);
        }

        String rawFileName = file.getOriginalFilename();
        String originalFileName = StringUtils.cleanPath(rawFileName != null ? rawFileName : "attachment");

        if (originalFileName.contains("..")) {
            throw new AppException("Tên tệp chứa ký tự đường dẫn không hợp lệ: " + originalFileName, HttpStatus.BAD_REQUEST);
        }

        String sanitizedName = originalFileName.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        String storedFileName = UUID.randomUUID() + "_" + sanitizedName;

        try {
            Files.createDirectories(this.fileStorageLocation);
            Path targetLocation = this.fileStorageLocation.resolve(storedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = determineContentType(originalFileName);
            }

            MessageType messageType = isImageFile(contentType, originalFileName) ? MessageType.IMAGE : MessageType.FILE;
            String normalizedBaseUrl = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "http://localhost:8080";
            String fileUrl = normalizedBaseUrl + "/api/files/" + storedFileName;

            log.info("Đã lưu tệp tải lên thành công: {} ({} bytes, type={})", storedFileName, file.getSize(), messageType);

            return FileUploadResponse.builder()
                    .fileName(storedFileName)
                    .originalFileName(originalFileName)
                    .fileUrl(fileUrl)
                    .contentType(contentType)
                    .fileSize(file.getSize())
                    .messageType(messageType)
                    .build();
        } catch (IOException ex) {
            log.error("Lỗi khi lưu tệp {}", originalFileName, ex);
            throw new AppException("Không thể lưu tệp tải lên: " + originalFileName, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileName) {
        try {
            if (fileName.contains("..")) {
                throw new AppException("Tên tệp không hợp lệ", HttpStatus.BAD_REQUEST);
            }
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new AppException("Không tìm thấy tệp: " + fileName, HttpStatus.NOT_FOUND);
            }
        } catch (MalformedURLException ex) {
            throw new AppException("Không tìm thấy tệp: " + fileName, HttpStatus.NOT_FOUND);
        }
    }

    @Override
    public String determineContentType(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            String detected = Files.probeContentType(filePath);
            if (detected != null) {
                return detected;
            }
        } catch (IOException ignored) {
        }

        String ext = getExtension(fileName);
        return switch (ext) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "svg" -> "image/svg+xml";
            case "pdf" -> "application/pdf";
            case "txt" -> "text/plain";
            case "zip" -> "application/zip";
            default -> "application/octet-stream";
        };
    }

    private boolean isImageFile(String contentType, String fileName) {
        if (contentType != null && contentType.toLowerCase().startsWith("image/")) {
            return true;
        }
        String ext = getExtension(fileName);
        return IMAGE_EXTENSIONS.contains(ext);
    }

    private String getExtension(String fileName) {
        if (fileName == null) return "";
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot < 0 || lastDot == fileName.length() - 1) return "";
        return fileName.substring(lastDot + 1).toLowerCase();
    }
}
