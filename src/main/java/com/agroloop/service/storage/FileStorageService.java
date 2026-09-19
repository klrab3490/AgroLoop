package com.agroloop.service.storage;

import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

/**
 * Abstraction contract for handling photographic media uploads and storage in AgroLoop.
 * Decouples file storage from specific providers (local disk, cloud bucket, etc.).
 */
public interface FileStorageService {

    /**
     * Validates and persists an uploaded multipart media file.
     *
     * @param file the uploaded multipart file
     * @param subDirectory the relative subdirectory to store the file within (e.g. "waste")
     * @return the relative normalized storage path (e.g. "waste/uuid.jpg"), or null if file is null/empty
     * @throws IllegalArgumentException if file validation fails (type, size, traversal attempt)
     */
    String storeFile(MultipartFile file, String subDirectory);

    /**
     * Resolves the absolute filesystem path for a given relative storage path.
     *
     * @param relativePath the relative storage path (e.g. "waste/uuid.jpg")
     * @return the resolved absolute Path
     * @throws IllegalArgumentException if relativePath contains path traversal attempts
     */
    Path loadFilePath(String relativePath);

    /**
     * Deletes a stored file from storage if it exists.
     *
     * @param relativePath the relative storage path of the file to delete
     */
    void deleteFile(String relativePath);
}
