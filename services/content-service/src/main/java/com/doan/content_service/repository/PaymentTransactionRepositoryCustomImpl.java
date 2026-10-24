package com.doan.content_service.repository;

import com.doan.content_service.model.PaymentTransaction;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Thay cho PESSIMISTIC_WRITE của JPA: điều kiện kiểm tra và cập nhật nằm
 * trong cùng một lệnh findAndModify nên hai request đồng thời không thể
 * cùng thành công.
 */
public class PaymentTransactionRepositoryCustomImpl
        implements PaymentTransactionRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public PaymentTransactionRepositoryCustomImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Optional<PaymentTransaction> markCashPaid(
            String transactionCode, LocalDateTime paidAt) {

        Query query = new Query(
                Criteria.where("transactionCode").is(transactionCode)
                        .and("method").is("CASH")
                        .and("status").is("PENDING"));

        Update update = new Update()
                .set("status", "PAID")
                .set("paidAt", paidAt);

        return Optional.ofNullable(mongoTemplate.findAndModify(
                query, update,
                FindAndModifyOptions.options().returnNew(true),
                PaymentTransaction.class));
    }

    @Override
    public Optional<PaymentTransaction> claimAccess(
            String claimCode, LocalDateTime usedAt) {

        Query query = new Query(
                Criteria.where("claimCode").is(claimCode)
                        .and("method").is("CASH")
                        .and("status").is("PAID")
                        .and("accessGranted").is(false)
                        .and("claimUsedAt").is(null));

        Update update = new Update()
                .set("accessGranted", true)
                .set("claimUsedAt", usedAt);

        return Optional.ofNullable(mongoTemplate.findAndModify(
                query, update,
                FindAndModifyOptions.options().returnNew(true),
                PaymentTransaction.class));
    }
}
