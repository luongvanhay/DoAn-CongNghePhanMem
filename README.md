# DoAn-CongNghePhanMem

## Khởi chạy dự án trên máy mới

Yêu cầu: Docker Desktop đang chạy và Node.js/npm đã được cài đặt.

1. Tạo file cấu hình local từ mẫu. Đổi `ADMIN_PASSWORD` trong `.env` trước khi chạy:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Khởi động backend và MongoDB:

   ```powershell
   docker compose up --build -d
   ```

   MongoDB sẽ nạp nội dung địa điểm, giao dịch mẫu và lượt truy cập mẫu từ
   `database/seed` khi khởi tạo volume lần đầu. Docker giữ dữ liệu trong volume
   `mongo_data` qua các lần khởi động sau. Tài khoản Admin đầu tiên lấy từ
   `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong `.env`.

3. Mở terminal khác để chạy frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Mở `http://localhost:5173`. Các thành viên dùng chung nội dung khởi tạo,
   nhưng dữ liệu phát sinh sau đó được lưu riêng trên máy mỗi người.

Không commit `.env`, mật khẩu, khóa JWT, khóa tích hợp hoặc bản sao database có
dữ liệu người dùng thật. Các giá trị trong `.env.example` chỉ dành cho phát triển
cục bộ; không dùng cho môi trường công khai.

## Tạo tài khoản Admin lần đầu

Auth service chỉ tạo Admin bootstrap khi được cung cấp `ADMIN_USERNAME` và
`ADMIN_PASSWORD`. Mật khẩu được mã hóa trước khi lưu trong MongoDB. Nếu
username đã tồn tại thì service không thay đổi tài khoản đó; vì vậy cơ chế này
không thể dùng để nâng quyền một tài khoản Provider hiện có.

Trong PowerShell tại thư mục dự án, đặt username và mật khẩu riêng (mật khẩu ít
nhất 8 ký tự), sau đó khởi động Docker Compose:

```powershell
$jwtBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($jwtBytes)
$rng.Dispose()
$env:JWT_SECRET = [Convert]::ToBase64String($jwtBytes)
$env:ADMIN_USERNAME = "admin"
$securePassword = Read-Host "Nhập mật khẩu Admin (ít nhất 8 ký tự)" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
docker compose up --build
```

Đăng nhập tại `http://localhost:5173/admin` bằng username và mật khẩu đã đặt.
Ghi nhớ mật khẩu này; Admin chỉ được tạo khi username chưa tồn tại. Giữ nguyên
dữ liệu MongoDB để giữ tài khoản. Nếu username đã có tài khoản, bootstrap sẽ
không thay đổi tài khoản đó; không xóa dữ liệu MongoDB để chạy bootstrap lại.

Không commit hoặc chia sẻ mật khẩu thật, và không dùng thông tin đăng nhập
phát triển cho môi trường production.

## Luồng khách tham quan và đa ngôn ngữ

- Mã QR cần trỏ đến URL gốc của website, không kèm `?lang=...`. Khách quét mã
  sẽ thấy trang chọn ngôn ngữ; trang chính hỗ trợ tiếng Việt, Anh, Trung, Hàn,
  Nhật, Pháp, Tây Ban Nha, Thái, Indonesia, Mã Lai, Đức, Nga, Ả Rập, Hindi và
  Bồ Đào Nha.
- Trong Admin, mục **Mã QR dành cho khách tham quan** cho phép nhập địa chỉ
  website và tải QR dạng SVG để in. Không in QR chứa `localhost`; điện thoại
  khách phải truy cập được URL đã nhập.
- Giao diện được dịch sẵn. Nội dung địa điểm ưu tiên bản dịch Admin đã lưu
  trong MongoDB; nếu chưa có, frontend gọi Translation Service và dùng bản
  dịch đó để hiển thị cũng như gửi sang TTS để đọc cùng ngôn ngữ.
- Để bảo đảm lời thuyết minh chính xác và không phụ thuộc nhà cung cấp dịch,
  Admin có thể mở mục "Bản dịch thuyết minh" khi thêm/sửa địa điểm, nhập nội
  dung đã dịch cho từng ngôn ngữ rồi lưu. Khách chọn ngôn ngữ nào sẽ thấy và
  nghe nội dung của ngôn ngữ đó; chỉ ngôn ngữ có bản dịch mới có thể phát nếu
  dịch vụ dịch tự động chưa được cấu hình.
- Mã QR của khách gắn `source=qr`; mỗi tab truy cập ghi nhận mã khách ngẫu
  nhiên, mã phiên, thời điểm, nguồn QR/truy cập trực tiếp và ngôn ngữ đã chọn
  vào MongoDB `content_db.visits`. Admin xem 100 lượt gần nhất trong mục
  "Khách đã quét QR / truy cập". Không lưu tên, email, mật khẩu hay dữ liệu
  đăng nhập; mã khách chỉ là mã nhận diện ẩn danh của trình duyệt.
- Luồng khách tham quan: quét QR → chọn ngôn ngữ → chọn thanh toán VNPay QR
  hoặc tiền mặt tại quầy → vào bản đồ và nghe thuyết minh bằng ngôn ngữ đã chọn.
  Đăng ký merchant sandbox tại `http://sandbox.vnpayment.vn/devreg/`, sau đó
  thêm `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` vào `.env` cục bộ. Không commit
  hoặc chia sẻ khóa bí mật. Giao dịch chỉ được mở quyền sau khi chữ ký/kết quả
  VNPay hợp lệ. Khi triển khai công khai, thay callback bằng domain HTTPS công
  khai và cấu hình IPN VNPay tới `/payments/vnpay/ipn`; `localhost` chỉ dùng
  thử trên máy tính.
  Với tiền mặt, khách đưa mã giao dịch cho nhân viên và thanh toán tại quầy.
  Admin đăng nhập, mở mục "Thanh toán tiền mặt", xác nhận đã thu tiền rồi đưa
  mã xác nhận một lần cho khách nhập trên trang thanh toán.
- Translation Service cần truy cập được nhà cung cấp dịch thuật. URL mặc định
  `https://libretranslate.com/translate` yêu cầu API key. Đặt key do nhà cung
  cấp cấp cho bạn trong PowerShell trước khi chạy Docker Compose:
  `$env:TRANSLATION_API_KEY = "API_KEY_CUA_BAN"`. Sau đó chạy lại
  `docker compose up -d --build translation-service`. Không chia sẻ hoặc commit key.
  Dịch tự động có thể thất bại nếu nhà cung cấp không khả dụng hoặc không hỗ
  trợ cặp ngôn ngữ; khi đó trang sẽ báo lỗi và có thể chọn Tiếng Việt.
