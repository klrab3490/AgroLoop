# ==========================================
# Multi-stage Dockerfile for AgroLoop App
# ==========================================

# 1. Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:resolve dependency:resolve-plugins -B || true

# Copy sources and compile JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# 2. Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create upload directory and non-root application user
RUN addgroup -S agroloop && adduser -S agroloop -G agroloop && \
    mkdir -p /app/uploads && chown -R agroloop:agroloop /app

USER agroloop:agroloop

# Copy compiled jar from build stage
COPY --from=builder /build/target/*.jar app.jar

ENV PORT=8080
ENV UPLOAD_DIR=/app/uploads

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
