package com.doan.content_service.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CurrencyConversionService {
    private static final String RATE_API = "https://open.er-api.com/v6/latest/";
    private static final Set<String> ALLOWED_CURRENCIES = Set.of(
            "USD", "EUR", "GBP", "JPY", "KRW", "AUD", "CAD", "SGD", "THB", "CNY");

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentHashMap<String, RateInfo> rateCache = new ConcurrentHashMap<>();

    public Conversion convert(BigDecimal amount, String currency) {
        if (amount == null || amount.signum() <= 0 || amount.precision() > 16) {
            throw new IllegalArgumentException("Số tiền ngoại tệ không hợp lệ.");
        }
        String code = currency == null ? "" : currency.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_CURRENCIES.contains(code)) {
            throw new IllegalArgumentException("Mã tiền tệ chưa được hỗ trợ.");
        }
        RateInfo info = getRate(code);
        BigDecimal converted = amount.multiply(info.rate()).setScale(0, RoundingMode.HALF_UP);
        return new Conversion(code, amount, converted, info.rate(), info.updatedAt());
    }

    private synchronized RateInfo getRate(String code) {
        RateInfo cached = rateCache.get(code);
        if (cached != null && cached.nextUpdateEpoch() > System.currentTimeMillis() / 1000) return cached;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RATE_API + code)).timeout(Duration.ofSeconds(8)).GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) throw new IllegalStateException("Dịch vụ tỷ giá hiện không khả dụng.");
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode rateNode = root.path("rates").path("VND");
            if (!"success".equals(root.path("result").asText()) || !rateNode.isNumber()) {
                throw new IllegalStateException("Không lấy được tỷ giá VND.");
            }
            RateInfo info = new RateInfo(rateNode.decimalValue(), root.path("time_last_update_utc").asText(),
                    root.path("time_next_update_unix").asLong(System.currentTimeMillis() / 1000 + 3600));
            rateCache.put(code, info);
            return info;
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Không thể kết nối dịch vụ tỷ giá. Vui lòng thử lại.", e);
        }
    }

    private record RateInfo(BigDecimal rate, String updatedAt, long nextUpdateEpoch) {}

    public record Conversion(String currency, BigDecimal foreignAmount, BigDecimal amountVnd,
                             BigDecimal rate, String rateUpdatedAt) {}
}
