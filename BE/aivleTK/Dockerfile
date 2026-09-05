FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Application Insights Java Agent (Maven Central에서 버전 고정 다운로드)
ARG AI_AGENT_VERSION=3.7.6
ADD https://repo1.maven.org/maven2/com/microsoft/azure/applicationinsights-agent/${AI_AGENT_VERSION}/applicationinsights-agent-${AI_AGENT_VERSION}.jar /agent/applicationinsights-agent.jar

# Spring Boot JAR 복사
COPY build/libs/*.jar app.jar

EXPOSE 8080

# javaagent 활성화
ENTRYPOINT ["java","-javaagent:/agent/applicationinsights-agent.jar","-jar","app.jar"]
