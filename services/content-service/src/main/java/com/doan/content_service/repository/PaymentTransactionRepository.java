package com.doan.content_service.repository;

import com.doan.content_service.model.PaymentTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository
        extends MongoRepository<PaymentTransaction, String>,
                PaymentTransactionRepositoryCustom {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findByClaimCode(String claimCode);

    List<PaymentTransaction> findByStatus(String status);

    Optional<PaymentTransaction> findFirstBySessionIdAndStatusAndAccessGranted(
            String sessionId, String status, boolean accessGranted);

    List<PaymentTransaction> findByMethodAndStatusOrderByCreatedAtDesc(
            String method, String status);
}
