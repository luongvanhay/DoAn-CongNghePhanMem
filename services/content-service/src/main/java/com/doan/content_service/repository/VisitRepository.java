package com.doan.content_service.repository;

import com.doan.content_service.model.Visit;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;

public interface VisitRepository
        extends MongoRepository<Visit, String>, VisitRepositoryCustom {

    long countByVisitedAtGreaterThanEqual(LocalDateTime from);
}
