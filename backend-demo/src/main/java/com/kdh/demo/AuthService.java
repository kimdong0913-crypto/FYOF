package com.kdh.demo;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * 아이디·비밀번호 로그인. 로그인하면 랜덤 토큰을 발급하고, 프론트는 요청마다
 * "Authorization: Bearer 토큰" 헤더로 보낸다. 토큰은 30일 뒤 만료된다.
 * 비밀번호는 BCrypt 로 암호화해서 저장하므로 DB 를 봐도 원래 비밀번호를 알 수 없다.
 */
@Service
public class AuthService {

    public record User(long id, String username, String nickname) {
        /** 커뮤니티 글·투표·옷장 테이블에 저장하는 사용자 키 */
        public String key() { return "u:" + id; }
    }

    private static final int SESSION_DAYS = 30;

    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();
    private volatile boolean schemaReady;

    public AuthService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public User signup(String username, String password, String nickname) {
        ensureSchema();
        try {
            jdbc.update("INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)",
                    username, encoder.encode(password), nickname);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디예요.");
        }
        return findByUsername(username).orElseThrow();
    }

    /** 아이디나 비밀번호가 틀리면 어느 쪽이 틀렸는지 알려주지 않는다. */
    public User login(String username, String password) {
        ensureSchema();
        List<String> hash = jdbc.queryForList("SELECT password_hash FROM users WHERE username = ?", String.class, username);
        if (hash.isEmpty() || !encoder.matches(password, hash.get(0))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 맞지 않아요.");
        }
        return findByUsername(username).orElseThrow();
    }

    public String createSession(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        jdbc.update("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))",
                token, user.id(), SESSION_DAYS);
        return token;
    }

    public void logout(String authorization) {
        String token = token(authorization);
        if (!token.isEmpty()) jdbc.update("DELETE FROM sessions WHERE token = ?", token);
    }

    /** 헤더의 토큰으로 로그인한 사용자를 찾는다. 없거나 만료됐으면 empty. */
    public Optional<User> current(String authorization) {
        String token = token(authorization);
        if (token.isEmpty()) return Optional.empty();
        ensureSchema();
        List<User> users = jdbc.query("""
                SELECT u.id, u.username, u.nickname FROM sessions s JOIN users u ON u.id = s.user_id
                WHERE s.token = ? AND s.expires_at > UTC_TIMESTAMP()""",
                (rs, i) -> new User(rs.getLong("id"), rs.getString("username"), rs.getString("nickname")), token);
        return users.stream().findFirst();
    }

    public User require(String authorization) {
        return current(authorization).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요해요."));
    }

    private Optional<User> findByUsername(String username) {
        return jdbc.query("SELECT id, username, nickname FROM users WHERE username = ?",
                (rs, i) -> new User(rs.getLong("id"), rs.getString("username"), rs.getString("nickname")), username).stream().findFirst();
    }

    private static String token(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return "";
        String token = authorization.substring(7).strip();
        return token.matches("[0-9a-f]{64}") ? token : "";
    }

    private void ensureSchema() {
        if (schemaReady) return;
        synchronized (this) {
            if (schemaReady) return;
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                      id BIGINT AUTO_INCREMENT PRIMARY KEY,
                      username VARCHAR(20) NOT NULL UNIQUE,
                      password_hash VARCHAR(100) NOT NULL,
                      nickname VARCHAR(12) NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                      token CHAR(64) PRIMARY KEY,
                      user_id BIGINT NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      expires_at DATETIME NOT NULL,
                      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            schemaReady = true;
        }
    }
}
