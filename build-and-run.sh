#!/usr/bin/env bash
set -e

echo "==================================================="
echo "BranchLink - Build and Run Unified Full-Stack App"
echo "==================================================="

echo "[1/3] Building React Frontend with Vite..."
cd frontend
npm run build
cd ..

echo "[2/3] Embedding Frontend Assets into Spring Boot..."
mkdir -p backend/src/main/resources/static
cp -r frontend/dist/* backend/src/main/resources/static/

echo "[3/3] Packaging Spring Boot Executable JAR..."
cd backend
mvn clean package -DskipTests

echo "==================================================="
echo "Build Successful! Starting BranchLink on http://localhost:8080 ..."
echo "==================================================="
java -jar target/branchlink-1.0.jar
