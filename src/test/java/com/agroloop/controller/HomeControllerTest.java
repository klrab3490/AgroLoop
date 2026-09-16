package com.agroloop.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class HomeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void homePageLoadsSuccessfullyWithDatabaseStatus() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"))
                .andExpect(model().attributeExists("appName", "currentPhase", "dbConnected", "dbInfo"))
                .andExpect(model().attribute("dbConnected", true))
                .andExpect(content().string(containsString("AgroLoop")))
                .andExpect(content().string(containsString("PostgreSQL Connected")))
                .andExpect(content().string(containsString("Login")));
    }
}
