package com.agroloop.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Controller
public class HomeController {

    private final DataSource dataSource;

    public HomeController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("appName", "AgroLoop");
        model.addAttribute("appTagline", "Bridging Waste Management, Agriculture & Sustainable Commerce");
        model.addAttribute("currentPhase", "Phase 1: Project Setup");
        model.addAttribute("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        // Check database connection status
        boolean dbConnected = false;
        String dbInfo = "Unavailable";
        try (Connection conn = dataSource.getConnection()) {
            dbConnected = true;
            DatabaseMetaData metaData = conn.getMetaData();
            dbInfo = metaData.getDatabaseProductName() + " " + metaData.getDatabaseProductVersion();
        } catch (Exception e) {
            dbInfo = "Connection Error: " + e.getMessage();
        }

        model.addAttribute("dbConnected", dbConnected);
        model.addAttribute("dbInfo", dbInfo);

        return "index";
    }
}
