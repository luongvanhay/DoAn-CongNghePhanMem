package com.doan.content_service.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@Document(collection = "payment_transactions")
public class PaymentTransaction {

    @Id
    private String id;

    @Indexed(unique = true)
    private String transactionCode;

    // Chỉ giao dịch CASH mới có claimCode. Phải để sparse, nếu không các
    // giao dịch PAYOO (claimCode = null) sẽ vi phạm unique index.
    @Indexed(unique = true, sparse = true)
    private String claimCode;

    private Long amount;
    private String currency;
    private BigDecimal foreignAmount;
    private BigDecimal exchangeRate;

    private String method;

    private String language;

    private String source;

    private String sessionId;

    private String status;

    private boolean accessGranted = false;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime paidAt;

    private LocalDateTime claimUsedAt;

    public PaymentTransaction() {
    }

    public String getId() { return id; }

    public String getTransactionCode() { return transactionCode; }
    public void setTransactionCode(String transactionCode) { this.transactionCode = transactionCode; }

    public String getClaimCode() { return claimCode; }
    public void setClaimCode(String claimCode) { this.claimCode = claimCode; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getForeignAmount() { return foreignAmount; }
    public void setForeignAmount(BigDecimal foreignAmount) { this.foreignAmount = foreignAmount; }
    public BigDecimal getExchangeRate() { return exchangeRate; }
    public void setExchangeRate(BigDecimal exchangeRate) { this.exchangeRate = exchangeRate; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isAccessGranted() { return accessGranted; }
    public void setAccessGranted(boolean accessGranted) { this.accessGranted = accessGranted; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public LocalDateTime getClaimUsedAt() { return claimUsedAt; }
    public void setClaimUsedAt(LocalDateTime claimUsedAt) { this.claimUsedAt = claimUsedAt; }
}
