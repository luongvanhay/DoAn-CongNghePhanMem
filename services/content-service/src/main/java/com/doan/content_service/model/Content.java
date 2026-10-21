
package com.doan.content_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contents")
public class Content {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "CLOB")
    private String body;

    @Column(length = 255)
    private String location;

    @Column(name = "source_language", nullable = false, length = 10)
    private String sourceLanguage = "vi";

    // ID người tạo nội dung
    @Column(name = "created_by")
    private String createdBy;

    // Tọa độ địa lý của POI
    private Double latitude;
    private Double longitude;

    // Bán kính kích hoạt POI, đơn vị mét
    @Column(name = "trigger_radius")
    private Integer triggerRadius = 30;

    // Đường dẫn hình ảnh
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    // Độ ưu tiên phát âm thanh
    @Column(name = "audio_priority")
    private Integer audioPriority = 0;

    // Trạng thái hoạt động của POI
    @Column(name = "is_active")
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Content() {}

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getLocation() {
        return location;
    }

    public String getSourceLanguage() {
        return sourceLanguage;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public Integer getTriggerRadius() {
        return triggerRadius;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Integer getAudioPriority() {
        return audioPriority;
    }

    public Boolean getActive() {
        return active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setSourceLanguage(String sourceLanguage) {
        this.sourceLanguage = sourceLanguage;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public void setTriggerRadius(Integer triggerRadius) {
        this.triggerRadius = triggerRadius;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public void setAudioPriority(Integer audioPriority) {
        this.audioPriority = audioPriority;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
