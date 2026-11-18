package com.doan.content_service.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
public class PoiImageController {

    private static final long MAX_IMAGE_SIZE = 8L * 1024 * 1024;
    private static final long MAX_IMAGE_PIXELS = 40_000_000L;
    private static final Pattern STORED_FILENAME =
            Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png)$");

    private final Path imageDirectory;

    public PoiImageController(
            @Value("${app.poi-image-dir:./uploads/poi}") String imageDirectory) {
        this.imageDirectory = Paths.get(imageDirectory).toAbsolutePath().normalize();
    }

    @PostMapping(
            path = "/contents/images",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        checkUploadPermission(request);

        if (file.isEmpty() || file.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ảnh phải có dung lượng từ 1 byte đến 8 MB");
        }

        try {
            byte[] bytes = file.getBytes();
            String extension = validateImage(bytes);
            String filename = UUID.randomUUID() + "." + extension;

            Files.createDirectories(imageDirectory);
            Files.write(imageDirectory.resolve(filename), bytes);

            return Map.of("imageUrl", "/api/content/images/" + filename);
        } catch (IOException error) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không thể lưu ảnh địa điểm", error);
        }
    }

    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> getImage(
            @org.springframework.web.bind.annotation.PathVariable String filename) {
        if (!STORED_FILENAME.matcher(filename).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        Path imagePath = imageDirectory.resolve(filename).normalize();
        if (!imagePath.startsWith(imageDirectory) || !Files.isRegularFile(imagePath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        MediaType mediaType = filename.endsWith(".png")
                ? MediaType.IMAGE_PNG
                : MediaType.IMAGE_JPEG;

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .body(new FileSystemResource(imagePath));
    }

    private void checkUploadPermission(HttpServletRequest request) {
        Object roleValue = request.getAttribute("role");
        String role = roleValue == null
                ? ""
                : roleValue.toString().trim().toUpperCase(Locale.ROOT);

        if (!"ADMIN".equals(role) && !"PROVIDER".equals(role)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản không có quyền tải ảnh địa điểm");
        }

        if ("PROVIDER".equals(role)
                && !Boolean.TRUE.equals(request.getAttribute("poiOwnerVerified"))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản chủ địa điểm chưa được Admin xác minh");
        }
    }

    private String validateImage(byte[] bytes) {
        try (ImageInputStream input = ImageIO.createImageInputStream(
                new ByteArrayInputStream(bytes))) {
            if (input == null) {
                throw invalidImage();
            }

            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalidImage();
            }

            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);

                if (width < 1 || height < 1
                        || (long) width * height > MAX_IMAGE_PIXELS) {
                    throw invalidImage();
                }

                if ("jpeg".equals(format) || "jpg".equals(format)) {
                    return "jpg";
                }
                if ("png".equals(format)) {
                    return "png";
                }
                throw invalidImage();
            } finally {
                reader.dispose();
            }
        } catch (IOException error) {
            throw invalidImage();
        }
    }

    private ResponseStatusException invalidImage() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chỉ chấp nhận ảnh JPEG hoặc PNG hợp lệ");
    }
}
