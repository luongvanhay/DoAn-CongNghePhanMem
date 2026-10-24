package com.doan.content_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TranslationRequest {

    // Khi gọi PUT /contents/{id}/translations/{lang} thì lấy mã ngôn ngữ từ URL,
    // còn khi gửi trong danh sách translations thì bắt buộc có.
    @Size(max = 10, message = "Mã ngôn ngữ tối đa 10 ký tự")
    private String languageCode;

    @NotBlank(message = "Tiêu đề bản dịch không được để trống")
    @Size(max = 255, message = "Tiêu đề bản dịch tối đa 255 ký tự")
    private String title;

    @NotBlank(message = "Nội dung bản dịch không được để trống")
    private String description;

    @Size(max = 500, message = "URL âm thanh tối đa 500 ký tự")
    private String audioUrl;

    public String getLanguageCode() { return languageCode; }
    public void setLanguageCode(String languageCode) { this.languageCode = languageCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
}
