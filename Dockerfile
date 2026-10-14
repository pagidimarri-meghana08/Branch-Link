# ===================================================================
# BranchLink - Unified Full-Stack Dockerfile for Free Cloud Hosting
# Builds React frontend + Spring Boot backend into a single container
# ===================================================================

# Stage 1: Build the React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Spring Boot Backend with Frontend embedded in static resources
FROM maven:3.9.6-eclipse-temurin-17 AS backend-builder
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B
COPY backend/src ./src

# Embed Vite production build directly into Spring Boot classpath static folder
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static

RUN mvn clean package -DskipTests

# Stage 3: Lightweight Production JRE Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Ensure directories for uploaded KYC documents and database persistence exist
RUN mkdir -p /app/uploads /app/data

COPY --from=backend-builder /app/backend/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
