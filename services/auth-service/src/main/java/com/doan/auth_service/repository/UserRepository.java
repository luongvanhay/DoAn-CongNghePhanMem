
package com.doan.auth_service.repository;

import com.doan.auth_service.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByUsername(String username);

    java.util.List<User> findByRole(User.Role role);

    boolean existsByUsername(String username);
}
