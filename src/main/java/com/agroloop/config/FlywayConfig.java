package com.agroloop.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Custom Flyway migration strategy.
 * Executes flyway.repair() before flyway.migrate() to automatically reconcile checksum mismatches
 * in environments where migration scripts have been updated.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairBeforeMigrateStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
