package com.team17.chatapp.chat;

import com.team17.chatapp.chat.dto.FileUploadResponse;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.chat.service.FileStorageServiceImpl;
import com.team17.chatapp.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Tuần 3: Tải lên file hình ảnh và phân loại MessageType.IMAGE chính xác")
    void testStoreImageFile_Success() {
        FileStorageServiceImpl storageService = new FileStorageServiceImpl(tempDir.toString());
        byte[] content = "fake-image-content".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile imageFile = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                content
        );

        FileUploadResponse response = storageService.storeFile(imageFile, "http://localhost:8080");

        assertNotNull(response);
        assertEquals("avatar.png", response.getOriginalFileName());
        assertEquals(MessageType.IMAGE, response.getMessageType());
        assertEquals(content.length, response.getFileSize());
        assertTrue(response.getFileUrl().startsWith("http://localhost:8080/api/files/"));

        Resource loaded = storageService.loadFileAsResource(response.getFileName());
        assertTrue(loaded.exists());
    }

    @Test
    @DisplayName("Tuần 3: Tải lên tài liệu PDF và phân loại MessageType.FILE chính xác")
    void testStoreDocumentFile_Success() {
        FileStorageServiceImpl storageService = new FileStorageServiceImpl(tempDir.toString());
        byte[] content = "pdf-document-bytes".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile docFile = new MockMultipartFile(
                "file",
                "report-week3.pdf",
                "application/pdf",
                content
        );

        FileUploadResponse response = storageService.storeFile(docFile, "http://localhost:8080");

        assertNotNull(response);
        assertEquals("report-week3.pdf", response.getOriginalFileName());
        assertEquals(MessageType.FILE, response.getMessageType());
        assertEquals(content.length, response.getFileSize());
    }

    @Test
    @DisplayName("Tuần 3: Báo lỗi khi tải lên file rỗng")
    void testStoreEmptyFile_ThrowsBadRequest() {
        FileStorageServiceImpl storageService = new FileStorageServiceImpl(tempDir.toString());
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.txt",
                "text/plain",
                new byte[0]
        );

        AppException ex = assertThrows(AppException.class, () ->
                storageService.storeFile(emptyFile, "http://localhost:8080")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }
}
