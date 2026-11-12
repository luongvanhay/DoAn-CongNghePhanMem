
package com.doan.auth_service.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String password;

    private Role role;

    private AccountStatus status;

    private Instant createdAt;

    // Chỉ được bật true sau khi Admin duyệt hồ sơ
    private boolean poiOwnerVerified = false;

    public User() {
    }

    public User(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.status = AccountStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.poiOwnerVerified = false;
    }

   public enum Role {
    ADMIN,
    ADMINSTAFF,
    PROVIDER,
    VISITOR
}

    public enum AccountStatus {
        ACTIVE,
        LOCKED
    }

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isPoiOwnerVerified() {
        return poiOwnerVerified;
    }

    public void setPoiOwnerVerified(boolean poiOwnerVerified) {
        this.poiOwnerVerified = poiOwnerVerified;
    }
}
