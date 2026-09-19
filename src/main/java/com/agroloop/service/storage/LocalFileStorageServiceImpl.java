package com.agroloop.service.storage;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Local filesystem implementation of FileStorageService.
 * Enforces server-side UUID filename generation, strict path traversal guards,
 * and MIME type verification.
 */
@Service
public class LocalFileStorageServiceImpl implements FileStorageService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
    );

    private final Path rootLocation;

    public LocalFileStorageServiceImpl(@Value("${agroloop.upload.dir:uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not initialize storage directory: " + rootLocation, ex);
        }
    }

    @Override
    public String storeFile(MultipartFile file, String subDirectory) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        validateFile(file);

        String safeSubDir = sanitizeSubdirectory(subDirectory);
        Path targetDir = rootLocation.resolve(safeSubDir).normalize();
        validatePathContainment(targetDir);

        try {
            Files.createDirectories(targetDir);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not create target upload directory: " + targetDir, ex);
        }

        String extension = extractExtension(file);
        String uniqueFilename = UUID.randomUUID() + extension;
        Path targetFile = targetDir.resolve(uniqueFilename).normalize();
        validatePathContainment(targetFile);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to persist file: " + uniqueFilename, ex);
        }

        String relativeResult = (safeSubDir.isEmpty() ? "" : safeSubDir + "/") + uniqueFilename;
        return relativeResult.replace('\\', '/');
    }

    @Override
    public Path loadFilePath(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            throw new IllegalArgumentException("File path cannot be blank");
        }
        if (relativePath.contains("..")) {
            throw new IllegalArgumentException("Path traversal attempt detected: " + relativePath);
        }

        Path resolved = rootLocation.resolve(relativePath).normalize();
        validatePathContainment(resolved);
        return resolved;
    }

    @Override
    public void deleteFile(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }
        try {
            Path file = loadFilePath(relativePath);
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // Best effort deletion
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 10MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Invalid file type [" + contentType + "]. Only JPEG, PNG, and WebP images are allowed.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String cleanName = StringUtils.cleanPath(originalFilename);
            if (cleanName.contains("..")) {
                throw new IllegalArgumentException("Invalid filename with path traversal: " + originalFilename);
            }
        }
    }

    private String sanitizeSubdirectory(String subDirectory) {
        if (subDirectory == null || subDirectory.isBlank()) {
            return "";
        }
        String clean = StringUtils.cleanPath(subDirectory.trim());
        if (clean.contains("..") || clean.startsWith("/") || clean.startsWith("\\")) {
            throw new IllegalArgumentException("Invalid subdirectory path: " + subDirectory);
        }
        return clean;
    }

    private void validatePathContainment(Path path) {
        if (!path.startsWith(rootLocation)) {
            throw new IllegalArgumentException("Access denied: path is outside upload root directory.");
        }
    }

    private String extractExtension(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (ALLOWED_EXTENSIONS.contains(ext)) {
                return ext;
            }
        }

        String contentType = file.getContentType();
        if ("image/png".equalsIgnoreCase(contentType)) {
            return ".png";
        } else if ("image/webp".equalsIgnoreCase(contentType)) {
            return ".webp";
        }
        return ".jpg";
    }
}
