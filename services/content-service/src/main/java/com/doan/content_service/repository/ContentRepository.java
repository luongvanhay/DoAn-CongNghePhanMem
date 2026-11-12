
package com.doan.content_service.repository;

import com.doan.content_service.model.Content;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ContentRepository extends MongoRepository<Content, String> {

    List<Content> findByCreatedBy(String createdBy);
}
