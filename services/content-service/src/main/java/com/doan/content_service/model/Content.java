package com.doan.content_service.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "contents")
public class Content {

    @Id
    private String id;

    // Nội dung gốc, viết bằng ngôn ngữ sourceLanguage
    private String title;

    private String body;

    private String location;

    private String sourceLanguage = "vi";

    // ID người tạo nội dung (userId bên auth-service)
    private String createdBy;

    // Tọa độ địa lý của POI
    private Double latitude;
    private Double longitude;

    // Bán kính kích hoạt POI, đơn vị mét
    private Integer triggerRadius = 30;

    // Đường dẫn hình ảnh
    private String imageUrl;

    // Độ ưu tiên phát âm thanh
    private Integer audioPriority = 0;

    // Trạng thái hoạt động của POI
    private Boolean active = true;

    // Bản dịch sang các ngôn ngữ khác (không chứa ngôn ngữ gốc)
    private List<ContentTranslation> translations = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public Content() {}

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getLocation() { return location; }
    public String getSourceLanguage() { return sourceLanguage; }
    public String getCreatedBy() { return createdBy; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public Integer getTriggerRadius() { return triggerRadius; }
    public String getImageUrl() { return imageUrl; }
    public Integer getAudioPriority() { return audioPriority; }
    public Boolean getActive() { return active; }
    public List<ContentTranslation> getTranslations() { return translations; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(String id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setBody(String body) { this.body = body; }
    public void setLocation(String location) { this.location = location; }
    public void setSourceLanguage(String sourceLanguage) { this.sourceLanguage = sourceLanguage; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setTriggerRadius(Integer triggerRadius) { this.triggerRadius = triggerRadius; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setAudioPriority(Integer audioPriority) { this.audioPriority = audioPriority; }
    public void setActive(Boolean active) { this.active = active; }
    public void setTranslations(List<ContentTranslation> translations) {
        this.translations = translations == null ? new ArrayList<>() : translations;
    }
}
