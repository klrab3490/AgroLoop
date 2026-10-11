package com.agroloop.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("OpenAPI 3.1 Contract Generation Integration Test")
class OpenApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /v3/api-docs returns valid OpenAPI JSON schema with BearerAuth security scheme")
    void testOpenApiDocsAvailable() throws Exception {
        org.springframework.test.web.servlet.MvcResult result = mockMvc.perform(get("/v3/api-docs")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.openapi").value("3.1.0"))
                .andExpect(jsonPath("$.info.title").value("AgroLoop Circular Economy Platform API"))
                .andExpect(jsonPath("$.info.version").value("v1"))
                .andExpect(jsonPath("$.components.securitySchemes.BearerAuth.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.BearerAuth.scheme").value("bearer"))
                .andExpect(jsonPath("$.components.securitySchemes.BearerAuth.bearerFormat").value("JWT"))
                .andExpect(jsonPath("$.paths['/api/v1/auth/login']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/marketplace/products']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/orders']").exists())
                .andReturn();

        // Write canonical contract snapshot for Phase 8 clients
        java.nio.file.Path snapshotDir = java.nio.file.Paths.get("clients", "openapi");
        java.nio.file.Files.createDirectories(snapshotDir);
        java.nio.file.Files.writeString(
                snapshotDir.resolve("openapi.json"),
                result.getResponse().getContentAsString(),
                java.nio.charset.StandardCharsets.UTF_8
        );
    }
}
