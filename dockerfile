# ===== Стадия 1: сборка (JDK + Gradle) =====
FROM gradle:8.10-jdk21 AS build
WORKDIR /app

# Сначала только файлы сборки — слой с зависимостями кэшируется,
# повторные сборки будут быстрыми
COPY build.gradle.kts settings.gradle.kts ./
RUN gradle dependencies --no-daemon --quiet || true

COPY src ./src
RUN gradle installDist --no-daemon

# ===== Стадия 2: рантайм (только JRE — образ заметно меньше) =====
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/install/luxkolbasa/ ./

ENV PORT=8080
EXPOSE 8080

CMD ["./bin/luxkolbasa"]