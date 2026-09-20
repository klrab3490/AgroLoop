package com.agroloop.controller.api.v1;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("SystemApiController Integration Tests — Discovery, Health & Version Handshake")
class SystemApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/health should return public service status without authentication")
    void getHealth_shouldReturnPublicStatus() throws Exception {
        mockMvc.perform(get("/api/v1/health")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ok")))
                .andExpect(jsonPath("$.service", is("agroloop")));
    }

    @Test
    @DisplayName("GET /api/v1/meta should return compatibility metadata without authentication")
    void getMeta_shouldReturnCompatibilityMetadata() throws Exception {
        mockMvc.perform(get("/api/v1/meta")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ok")))
                .andExpect(jsonPath("$.service", is("agroloop")))
                .andExpect(jsonPath("$.api_version", is("v1")))
                .andExpect(jsonPath("$.minimum_client_version", is("1.0.0")))
                .andExpect(jsonPath("$.server_version", is("8.0.0")));
    }
}
