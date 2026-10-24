package com.doan.content_service.model;

/**
 * Bản dịch của một POI, nhúng trong document "contents".
 * Mỗi ngôn ngữ chỉ có một bản dịch (languageCode là duy nhất trong một POI).
 */
public class ContentTranslation {

    private String languageCode;
    private String title;
    private String description;
    private String audioUrl;

    public ContentTranslation() {
    }

    public ContentTranslation(
            String languageCode, String title,
            String description, String audioUrl) {
        this.languageCode = languageCode;
        this.title = title;
        this.description = description;
        this.audioUrl = audioUrl;
    }

    public String getLanguageCode() { return languageCode; }
    public void setLanguageCode(String languageCode) { this.languageCode = languageCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
}
