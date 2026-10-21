
package com.doan.content_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Min;

public class ContentRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    private String body;

    @Size(max = 255, message = "Địa điểm tối đa 255 ký tự")
    private String location;

    @NotBlank(message = "Ngôn ngữ gốc không được để trống")
    @Size(min = 2, max = 10, message = "Mã ngôn ngữ phải từ 2 đến 10 ký tự")
    private String sourceLanguage = "vi";

    // Tọa độ GPS của địa điểm (có thể để trống)
    @DecimalMin(value = "-90.0", message = "Vĩ độ phải >= -90")
    @DecimalMax(value = "90.0", message = "Vĩ độ phải <= 90")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "Kinh độ phải >= -180")
    @DecimalMax(value = "180.0", message = "Kinh độ phải <= 180")
    private Double longitude;

    // Bán kính kích hoạt, đơn vị mét
    @Min(value = 1, message = "Bán kính kích hoạt phải lớn hơn 0")
    private Integer triggerRadius = 30;

    // Đường dẫn hình ảnh
    @Size(max = 500, message = "URL hình ảnh tối đa 500 ký tự")
    private String imageUrl;

    // Độ ưu tiên phát âm thanh
    @Min(value = 0, message = "Độ ưu tiên không được âm")
    private Integer audioPriority = 0;

    // Trạng thái hoạt động
    private Boolean active = true;

    // Getters
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

    // Setters
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
