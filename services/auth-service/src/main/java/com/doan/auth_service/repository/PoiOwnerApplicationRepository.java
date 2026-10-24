
package com.doan.auth_service.repository;

import com.doan.auth_service.model.PoiOwnerApplication;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PoiOwnerApplicationRepository
        extends MongoRepository<PoiOwnerApplication, String> {

    List<PoiOwnerApplication> findByStatus(
            PoiOwnerApplication.ApplicationStatus status
    );

    Optional<PoiOwnerApplication> findFirstByUserIdOrderBySubmittedAtDesc(
            String userId
    );

    boolean existsByUserIdAndStatus(
            String userId,
            PoiOwnerApplication.ApplicationStatus status
    );
}
