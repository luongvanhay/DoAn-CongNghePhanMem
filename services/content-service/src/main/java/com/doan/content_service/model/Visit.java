package com.doan.content_service.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Document(collection = "visits")
public class Visit {

    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Id
    private String id;

    @Indexed
    private String visitorId;

    @Indexed
    private String sessionId;

    private String source;

    private String language;

    @Indexed
    private LocalDateTime visitedAt;

    public Visit() {
    }

    public Visit(String visitorId) {
        this.visitorId = visitorId;
        this.visitedAt = LocalDateTime.now(VN_ZONE);
    }

    public Visit(String visitorId, String sessionId, String source, String language) {
        this.id = sessionId;
        this.visitorId = visitorId;
        this.sessionId = sessionId;
        this.source = source;
        this.language = language;
        this.visitedAt = LocalDateTime.now(VN_ZONE);
    }

    public void updateDetails(String source, String language) {
        this.source = source;
        this.language = language;
    }

    public String getId() {
        return id;
    }

    public String getVisitorId() {
        return visitorId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getSource() {
        return source;
    }

    public String getLanguage() {
        return language;
    }

    public LocalDateTime getVisitedAt() {
        return visitedAt;
    }
}
