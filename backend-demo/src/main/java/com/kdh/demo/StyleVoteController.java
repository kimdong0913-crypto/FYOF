package com.kdh.demo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * STYLE INDEX 커뮤니티 투표. 사람들이 어울리는 색조합/패션 아이템을 하나씩 올리고 투표한다.
 *   GET  /api/style-posts?lookId=wide&category=ALL|COLOR|ITEM&sort=votes|recent&voterId=...
 *   POST /api/style-posts               { lookId, category, title, colors[], comment, nickname }
 *   POST /api/style-posts/{id}/vote     { voterId }  -> 투표 토글 { votes, voted }
 * 로그인이 없으므로 브라우저마다 만든 voterId 로 중복 투표를 막는다.
 */
@RestController
@RequestMapping("/api/style-posts")
public class StyleVoteController {

    private static final Logger log = LoggerFactory.getLogger(StyleVoteController.class);
    private static final Set<String> LOOKS = Set.of("wide", "straight", "relaxed");
    private static final Set<String> CATEGORIES = Set.of("COLOR", "ITEM");
    private static final Pattern HEX = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    public record StylePost(long id, String lookId, String category, String title, List<String> colors,
                            String comment, String nickname, String createdAt, int votes, boolean voted) {}

    public record NewPost(String lookId, String category, String title, List<String> colors, String comment, String nickname) {}

    public record VoteRequest(String voterId) {}

    private final JdbcTemplate jdbc;
    private volatile boolean schemaReady;

    public StyleVoteController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<StylePost> list(@RequestParam(defaultValue = "wide") String lookId,
                                @RequestParam(defaultValue = "ALL") String category,
                                @RequestParam(defaultValue = "votes") String sort,
                                @RequestParam(defaultValue = "") String voterId) {
        ensureSchema();
        List<Object> args = new ArrayList<>(List.of(voterId, lookId));
        String where = "WHERE p.look_id = ?";
        if (CATEGORIES.contains(category)) {
            where += " AND p.category = ?";
            args.add(category);
        }
        String order = "recent".equals(sort) ? "p.id DESC" : "votes DESC, p.id DESC";
        return jdbc.query("""
                SELECT p.*, COUNT(v.post_id) AS votes, MAX(v.voter_id = ?) AS voted
                FROM style_posts p LEFT JOIN style_votes v ON v.post_id = p.id
                """ + where + " GROUP BY p.id ORDER BY " + order + " LIMIT 100",
                this::mapPost, args.toArray());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StylePost create(@RequestBody NewPost req) {
        ensureSchema();
        String lookId = LOOKS.contains(req.lookId()) ? req.lookId() : "wide";
        if (!CATEGORIES.contains(req.category())) throw bad("분류가 올바르지 않습니다.");
        String title = trim(req.title(), 40);
        if (title.isEmpty()) throw bad("조합 이름을 입력해 주세요.");
        List<String> colors = req.colors() == null ? List.of()
                : req.colors().stream().filter(c -> c != null && HEX.matcher(c).matches()).limit(3).toList();
        String comment = trim(req.comment(), 200);
        String nickname = trim(req.nickname(), 12);
        if (nickname.isEmpty()) nickname = "익명";

        long id = insert(lookId, req.category(), title, colors, comment, nickname);
        return jdbc.queryForObject("""
                SELECT p.*, 0 AS votes, 0 AS voted FROM style_posts p WHERE p.id = ?
                """, this::mapPost, id);
    }

    @PostMapping("/{id}/vote")
    public Map<String, Object> vote(@PathVariable long id, @RequestBody VoteRequest req) {
        ensureSchema();
        String voterId = trim(req.voterId(), 64);
        if (voterId.isEmpty()) throw bad("voterId 가 필요합니다.");
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts WHERE id = ?", Integer.class, id);
        if (exists == null || exists == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "의견을 찾을 수 없습니다.");

        // 이미 투표했으면 취소, 아니면 투표
        boolean voted = jdbc.update("DELETE FROM style_votes WHERE post_id = ? AND voter_id = ?", id, voterId) == 0;
        if (voted) {
            try {
                jdbc.update("INSERT INTO style_votes (post_id, voter_id) VALUES (?, ?)", id, voterId);
            } catch (DuplicateKeyException ignored) {
                // 같은 사람이 동시에 두 번 누른 경우
            }
        }
        Integer votes = jdbc.queryForObject("SELECT COUNT(*) FROM style_votes WHERE post_id = ?", Integer.class, id);
        return Map.of("votes", votes == null ? 0 : votes, "voted", voted);
    }

    @ExceptionHandler(DataAccessException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Map<String, String> dbError(DataAccessException e) {
        log.warn("Cloud SQL 오류: {}", e.getMostSpecificCause().getMessage());
        return Map.of("error", "데이터베이스에 연결할 수 없습니다.");
    }

    /** 처음 요청이 들어올 때 테이블을 만들고, 비어 있으면 카탈로그 기반 예시 의견을 넣는다. */
    private void ensureSchema() {
        if (schemaReady) return;
        synchronized (this) {
            if (schemaReady) return;
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS style_posts (
                      id BIGINT AUTO_INCREMENT PRIMARY KEY,
                      look_id VARCHAR(20) NOT NULL,
                      category VARCHAR(10) NOT NULL,
                      title VARCHAR(40) NOT NULL,
                      colors VARCHAR(30) NOT NULL DEFAULT '',
                      comment VARCHAR(200) NOT NULL DEFAULT '',
                      nickname VARCHAR(12) NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      INDEX idx_look (look_id, category)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS style_votes (
                      post_id BIGINT NOT NULL,
                      voter_id VARCHAR(64) NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      PRIMARY KEY (post_id, voter_id),
                      FOREIGN KEY (post_id) REFERENCES style_posts(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts", Integer.class);
            if (count != null && count == 0) seed();
            schemaReady = true;
            log.info("Cloud SQL 스타일 투표 테이블 준비 완료");
        }
    }

    private void seed() {
        insert("wide", "COLOR", "화이트 + 딥 인디고", List.of("#F1F0EC", "#2F3B7A"), "가장 깔끔한 정석 조합", "FYOF");
        insert("wide", "ITEM", "블랙 로퍼", List.of("#2E2E2E"), "와이드 핏 밑단이 로퍼에 자연스럽게 떨어져요", "FYOF");
        insert("wide", "ITEM", "테일러드 재킷", List.of("#4A4A4A"), "", "FYOF");
        insert("straight", "COLOR", "차콜 + 미드 블루", List.of("#3C3C3C", "#6E8FC4"), "오피스룩으로도 무난", "FYOF");
        insert("straight", "ITEM", "오버핏 블레이저", List.of("#4A4A4A"), "", "FYOF");
        insert("relaxed", "COLOR", "블랙 + 워시드 블루", List.of("#2B2B2B", "#AFC7E3"), "스트릿 무드엔 대비가 핵심", "FYOF");
        insert("relaxed", "ITEM", "화이트 스니커즈", List.of("#F1F0EC"), "", "FYOF");
    }

    private long insert(String lookId, String category, String title, List<String> colors, String comment, String nickname) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement(
                    "INSERT INTO style_posts (look_id, category, title, colors, comment, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())",
                    java.sql.Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, lookId);
            ps.setString(2, category);
            ps.setString(3, title);
            ps.setString(4, String.join(",", colors));
            ps.setString(5, comment);
            ps.setString(6, nickname);
            return ps;
        }, keys);
        return keys.getKey().longValue();
    }

    private StylePost mapPost(ResultSet rs, int row) throws SQLException {
        String colors = rs.getString("colors");
        return new StylePost(
                rs.getLong("id"),
                rs.getString("look_id"),
                rs.getString("category"),
                rs.getString("title"),
                colors == null || colors.isEmpty() ? List.of() : Arrays.asList(colors.split(",")),
                rs.getString("comment"),
                rs.getString("nickname"),
                // UTC 로 저장한 값을 시간대 변환 없이 그대로 읽어 ISO(UTC) 문자열로 돌려준다.
                rs.getString("created_at").replace(' ', 'T') + "Z",
                rs.getInt("votes"),
                rs.getInt("voted") == 1);
    }

    private static String trim(String s, int max) {
        if (s == null) return "";
        String t = s.strip();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
