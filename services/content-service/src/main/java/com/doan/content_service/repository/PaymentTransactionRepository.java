package com.doan.content_service.repository;

import com.doan.content_service.model.PaymentTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PaymentTransactionRepository
        extends MongoRepository<PaymentTransaction, String>,
                PaymentTransactionRepositoryCustom {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findByClaimCode(String claimCode);
}
