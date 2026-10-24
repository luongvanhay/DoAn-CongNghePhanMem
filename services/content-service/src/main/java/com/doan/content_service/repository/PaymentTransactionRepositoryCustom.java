package com.doan.content_service.repository;

import com.doan.content_service.model.PaymentTransaction;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PaymentTransactionRepositoryCustom {

    // Chuyển giao dịch CASH từ PENDING sang PAID trong MỘT thao tác nguyên tử.
    // Trả về rỗng nếu giao dịch không tồn tại / không phải CASH / không còn PENDING.
    Optional<PaymentTransaction> markCashPaid(
            String transactionCode, LocalDateTime paidAt);

    // Dùng claim code trong MỘT thao tác nguyên tử (chỉ thành công một lần).
    // Trả về rỗng nếu mã sai / chưa PAID / đã được dùng.
    Optional<PaymentTransaction> claimAccess(
            String claimCode, LocalDateTime usedAt);
}
