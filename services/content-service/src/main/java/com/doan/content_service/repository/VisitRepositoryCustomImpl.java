package com.doan.content_service.repository;

import com.doan.content_service.model.Visit;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class VisitRepositoryCustomImpl implements VisitRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public VisitRepositoryCustomImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public long countUniqueVisitors() {
        return countDistinctVisitors(null);
    }

    @Override
    public long countUniqueVisitorsSince(LocalDateTime from) {
        return countDistinctVisitors(Criteria.where("visitedAt").gte(from));
    }

    // Tương đương: select count(distinct visitor_id) ... [where visited_at >= ?]
    private long countDistinctVisitors(Criteria criteria) {
        List<AggregationOperation> operations = new ArrayList<>();

        if (criteria != null) {
            operations.add(Aggregation.match(criteria));
        }

        operations.add(Aggregation.group("visitorId"));
        operations.add(Aggregation.count().as("total"));

        AggregationResults<Document> results = mongoTemplate.aggregate(
                Aggregation.newAggregation(operations),
                Visit.class,
                Document.class);

        Document first = results.getUniqueMappedResult();

        if (first == null || first.get("total") == null) {
            return 0L;
        }

        return ((Number) first.get("total")).longValue();
    }
}
