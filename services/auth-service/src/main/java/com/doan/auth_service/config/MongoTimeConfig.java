package com.doan.auth_service.config;

import java.time.Instant;
import java.util.Date;
import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;

@Configuration
public class MongoTimeConfig {

    @Bean
    MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(InstantToDateConverter.INSTANCE, DateToInstantConverter.INSTANCE));
    }

    @WritingConverter
    enum InstantToDateConverter implements Converter<Instant, Date> {
        INSTANCE;

        @Override
        public Date convert(Instant source) {
            return Date.from(source);
        }
    }

    @ReadingConverter
    enum DateToInstantConverter implements Converter<Date, Instant> {
        INSTANCE;

        @Override
        public Instant convert(Date source) {
            return source.toInstant();
        }
    }
}
