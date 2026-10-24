package com.doan.content_service.repository;

import java.time.LocalDateTime;

public interface VisitRepositoryCustom {

    long countUniqueVisitors();

    long countUniqueVisitorsSince(LocalDateTime from);
}
