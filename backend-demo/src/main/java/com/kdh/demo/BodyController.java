package com.kdh.demo;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 내 체형(키·몸무게·체형 타입). 본인만 보고 고칠 수 있고, 다른 사람 프로필에는 나오지 않는다.
 *   GET    /api/body  -> { heightCm, weightKg, shape } (입력 안 했으면 204)
 *   PUT    /api/body  { heightCm, weightKg, shape }
 *   DELETE /api/body
 * 핏 추천은 프론트(body.ts)가 이 값으로 계산한다.
 */
@RestController
@RequestMapping("/api/body")
public class BodyController {

    /** 체형 타입. 모르면 빈 문자열(선택 안 함) */
    private static final Set<String> SHAPES = Set.of("", "balanced", "upper", "lower", "belly");

    public record Body(int heightCm, int weightKg, String shape) {}

    private final JdbcTemplate jdbc;
    private final AuthService auth;
    private volatile boolean schemaReady;

    public BodyController(JdbcTemplate jdbc, AuthService auth) {
        this.jdbc = jdbc;
        this.auth = auth;
    }

    @GetMapping
    public ResponseEntity<Body> body(@RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        List<Body> rows = jdbc.query("SELECT height_cm, weight_kg, shape FROM user_body WHERE user_id = ?",
                (rs, i) -> new Body(rs.getInt("height_cm"), rs.getInt("weight_kg"), rs.getString("shape")), user);
        return rows.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(rows.get(0));
    }

    @PutMapping
    public Body save(@RequestBody Body req, @RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        if (req.heightCm() < 120 || req.heightCm() > 220) throw bad("키는 120~220cm 사이로 입력해 주세요.");
        if (req.weightKg() < 30 || req.weightKg() > 200) throw bad("몸무게는 30~200kg 사이로 입력해 주세요.");
        String shape = req.shape() == null ? "" : req.shape();
        if (!SHAPES.contains(shape)) throw bad("체형을 다시 골라 주세요.");
        ensureSchema();
        jdbc.update("""
                INSERT INTO user_body (user_id, height_cm, weight_kg, shape, updated_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE height_cm = VALUES(height_cm), weight_kg = VALUES(weight_kg), shape = VALUES(shape), updated_at = UTC_TIMESTAMP()""",
                user, req.heightCm(), req.weightKg(), shape);
        return new Body(req.heightCm(), req.weightKg(), shape);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        jdbc.update("DELETE FROM user_body WHERE user_id = ?", user);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason()));
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private void ensureSchema() {
        if (schemaReady) return;
        synchronized (this) {
            if (schemaReady) return;
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS user_body (
                      user_id BIGINT PRIMARY KEY,
                      height_cm SMALLINT NOT NULL,
                      weight_kg SMALLINT NOT NULL,
                      shape VARCHAR(10) NOT NULL DEFAULT '',
                      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            schemaReady = true;
        }
    }
}
