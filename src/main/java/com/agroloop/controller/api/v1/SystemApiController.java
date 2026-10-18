package com.agroloop.controller.api.v1;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agroloop.dto.api.v1.response.SystemHealthApiResponse;
import com.agroloop.dto.api.v1.response.SystemMetaApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Public system discovery, health check, and client compatibility endpoints.
 * Unauthenticated by design to allow first-run server verification from Mobile,
 * Desktop, and Web.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "System Discovery", description = "Server metadata and health verification for client setup")
public class SystemApiController {

    private final String serverVersion;
    private final String apiVersion;
    private final String minimumClientVersion;
    private final String appVersion;
    private final String githubRepo;

    public SystemApiController(
            @Value("${agroloop.server.version:8.0.0}") String serverVersion,
            @Value("${agroloop.api.version:v1}") String apiVersion,
            @Value("${agroloop.api.minimum-client-version:1.0.0}") String minimumClientVersion,
            @Value("${agroloop.app.version:1.0.7}") String appVersion,
            @Value("${agroloop.github.repo:klrab3490/AgroLoop}") String githubRepo) {
        this.serverVersion = serverVersion;
        this.apiVersion = apiVersion;
        this.minimumClientVersion = minimumClientVersion;
        this.appVersion = appVersion;
        this.githubRepo = githubRepo;
    }

    @GetMapping("/health")
    @Operation(summary = "Health probe", description = "Returns service health status and identity.")
    public ResponseEntity<SystemHealthApiResponse> getHealth() {
        return ResponseEntity.ok(new SystemHealthApiResponse("ok", "agroloop"));
    }

    @GetMapping("/meta")
    @Operation(summary = "Server metadata", description = "Returns server capability and minimum supported client version.")
    public ResponseEntity<SystemMetaApiResponse> getMeta() {
        return ResponseEntity.ok(new SystemMetaApiResponse(
                "ok",
                "agroloop",
                apiVersion,
                minimumClientVersion,
                serverVersion,
                appVersion,
                githubRepo));
    }
}
