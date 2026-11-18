
package com.doan.content_service.repository;

import com.doan.content_service.model.Visit;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VisitRepository
        extends MongoRepository<Visit, String>, VisitRepositoryCustom {

    Optional<Visit> findFirstBySessionId(String sessionId);

    List<Visit> findTop100ByOrderByVisitedAtDesc();

    long countByVisitedAtGreaterThanEqual(LocalDateTime from);

    long countByLastSeenAtGreaterThanEqual(LocalDateTime from);
}
