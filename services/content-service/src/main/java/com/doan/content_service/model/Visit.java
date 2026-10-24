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
    private LocalDateTime visitedAt;

    public Visit() {
    }

    public Visit(String visitorId) {
        this.visitorId = visitorId;
        this.visitedAt = LocalDateTime.now(VN_ZONE);
    }

    public String getId() {
        return id;
    }

    public String getVisitorId() {
        return visitorId;
    }

    public LocalDateTime getVisitedAt() {
        return visitedAt;
    }
}
