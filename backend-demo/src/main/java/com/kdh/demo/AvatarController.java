package com.kdh.demo;

import java.io.IOException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * 프로필 사진. 사용자마다 한 장, 바꿀 때마다 version(저장한 시각)이 바뀐다.
 * 프론트는 GET /api/avatars 로 "누가 어떤 버전의 사진을 가졌는지"를 한 번에 받아서
 * /api/avatars/{userId}?v=버전 주소로 그린다 (버전이 주소에 있으니 오래 캐시해도 된다).
 */
@RestController
@RequestMapping("/api/avatars")
public class AvatarController {

    private static final long MAX_BYTES = 2L * 1024 * 1024;
    private static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final JdbcTemplate jdbc;
    private final AuthService auth;
    private volatile boolean schemaReady;

    public AvatarController(JdbcTemplate jdbc, AuthService auth) {
        this.jdbc = jdbc;
        this.auth = auth;
    }

    public record Saved(long userId, long version) {}

    /** 프로필 사진이 있는 사용자 번호 -> 버전 */
    @GetMapping
    public Map<Long, Long> versions() {
        ensureSchema();
        Map<Long, Long> out = new LinkedHashMap<>();
        jdbc.query("SELECT user_id, version FROM user_avatars", rs -> { out.put(rs.getLong(1), rs.getLong(2)); });
        return out;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<byte[]> image(@PathVariable long userId) {
        ensureSchema();
        List<ResponseEntity<byte[]>> found = jdbc.query("SELECT content_type, image FROM user_avatars WHERE user_id = ?",
                (rs, i) -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(rs.getString(1)))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)))
                        .body(rs.getBytes(2)),
                userId);
        if (found.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "프로필 사진이 없어요.");
        return found.get(0);
    }

    @PutMapping("/me")
    public Saved upload(@RequestParam("image") MultipartFile image,
                        @RequestHeader(value = "Authorization", required = false) String authorization) throws IOException {
        AuthService.User user = auth.require(authorization);
        ensureSchema();
        if (image.isEmpty()) throw bad("사진이 비어 있어요.");
        if (image.getSize() > MAX_BYTES) throw bad("프로필 사진은 2MB 이하로 올려 주세요.");
        String type = image.getContentType() == null ? "" : image.getContentType();
        if (!TYPES.contains(type)) throw bad("JPG·PNG·WEBP 사진만 올릴 수 있어요.");
        long version = System.currentTimeMillis();
        jdbc.update("REPLACE INTO user_avatars (user_id, content_type, image, version) VALUES (?, ?, ?, ?)",
                user.id(), type, image.getBytes(), version);
        return new Saved(user.id(), version);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@RequestHeader(value = "Authorization", required = false) String authorization) {
        AuthService.User user = auth.require(authorization);
        ensureSchema();
        jdbc.update("DELETE FROM user_avatars WHERE user_id = ?", user.id());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason()));
    }

    private void ensureSchema() {
        if (schemaReady) return;
        synchronized (this) {
            if (schemaReady) return;
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS user_avatars (
                      user_id BIGINT PRIMARY KEY,
                      content_type VARCHAR(40) NOT NULL,
                      image MEDIUMBLOB NOT NULL,
                      version BIGINT NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            schemaReady = true;
        }
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
