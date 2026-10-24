
package com.doan.auth_service.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "poi_owner_applications")
public class PoiOwnerApplication {

    @Id
    private String id;

    private String userId;
    private String businessName;
    private String contactName;
    private String phone;
    private String email;
    private String address;
    private String description;

    private ApplicationStatus status;
    private Instant submittedAt;
    private Instant reviewedAt;
    private String reviewedBy;
    private String rejectionReason;

    public enum ApplicationStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    public PoiOwnerApplication() {
    }

    public PoiOwnerApplication(
            String userId,
            String businessName,
            String contactName,
            String phone,
            String email,
            String address,
            String description
    ) {
        this.userId = userId;
        this.businessName = businessName;
        this.contactName = contactName;
        this.phone = phone;
        this.email = email;
        this.address = address;
        this.description = description;
        this.status = ApplicationStatus.PENDING;
        this.submittedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(String reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }
}
