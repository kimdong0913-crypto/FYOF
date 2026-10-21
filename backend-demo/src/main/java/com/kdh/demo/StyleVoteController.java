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
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 커뮤니티 코디. 사람들이 아이템을 어떻게 입는지 코디(OUTFIT)나 팁(TIP)으로 올리고 투표한다.
 * 코디는 아우터·상의·하의·신발·액세서리 칸마다 아이템과 색을 하나씩 고르며(아우터·액세서리는 선택),
 * 아이템 페이지는 그 아이템이 들어간 코디를 모아 "어떤 색으로, 무엇과 함께 입는지" 집계한다.
 *   GET    /api/style-posts?item=wide&category=ALL|OUTFIT|TIP&sort=votes|recent
 *   POST   /api/style-posts               (로그인) { item, category, title, comment, outfit..., colors[], gender, ageGroup }
 *   PUT    /api/style-posts/{id}          (본인)   { title, comment, outfit..., colors[] }
 *   DELETE /api/style-posts/{id}          (본인)
 *   POST   /api/style-posts/{id}/vote     (로그인) -> 투표 토글 { votes, voted }
 *   POST   /api/style-posts/{id}/report   (로그인) -> 신고 { reported, hidden }
 *   GET    /api/style-posts/ranking       -> 추천을 많이 받은 사람 순위
 *   GET    /api/style-posts/stats?item=wide&gender=&age= -> 이 아이템이 들어간 코디와 비중
 *   GET    /api/style-posts/popular       -> 전체 인기 코디
 * 작성자·투표자는 "u:사용자번호" 로 저장하고, 응답에는 mine/me 같은 true/false 로만 알려준다.
 */
@RestController
@RequestMapping("/api/style-posts")
public class StyleVoteController {

    private static final Logger log = LoggerFactory.getLogger(StyleVoteController.class);
    private static final Set<String> CATEGORIES = Set.of("OUTFIT", "TIP");
    private static final Pattern HEX = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    /** 신고가 이만큼 쌓이면 글을 숨긴다. */
    static final int REPORTS_TO_HIDE = 3;
    /** 패셔니스타 뱃지: 추천을 10개 이상 받거나, 글 5개 이상 + 추천 3개 이상 (본인 추천은 제외). */
    static final int BADGE_VOTES = 10;
    static final int BADGE_ACTIVE_POSTS = 5;
    static final int BADGE_ACTIVE_VOTES = 3;

    /** 코디 한 칸: 아이템 id + 색 id. 비어 있으면 둘 다 "". */
    public record Piece(String item, String color) {
        static final Piece NONE = new Piece("", "");
        boolean empty() { return item.isEmpty(); }
    }

    public record Outfit(Piece outer, Piece top, Piece bottom, Piece shoes, Piece acc) {}

    public record StylePost(long id, String item, String category, String title, List<String> colors,
                            String comment, String nickname, String createdAt, boolean edited, Outfit outfit,
                            int votes, boolean voted, boolean mine, boolean reported, boolean authorBadge) {}

    public record NewPost(String item, String category, String title, String comment, List<String> colors,
                          Outfit outfit, String gender, String ageGroup) {}

    public record EditPost(String title, String comment, List<String> colors, Outfit outfit) {}

    public record RankEntry(int rank, String nickname, int posts, int votes, boolean badge, boolean me) {}

    /** 집계용: 코디 하나와 비중(글 1개 = 1, 받은 추천 1개 = 1). */
    public record WeightedOutfit(long id, String title, Outfit outfit, int weight) {}

    public record Stats(int posts, List<WeightedOutfit> outfits) {}

    /** 작성자별 글 수와 받은 추천 수(본인 추천 제외). 숨겨진 글과 작성자 없는 예시 글은 빼고 센다. */
    private static final String AUTHOR_STATS = """
            SELECT p2.author_id,
                   COUNT(DISTINCT p2.id) AS posts,
                   COALESCE(SUM(v2.voter_id IS NOT NULL AND v2.voter_id <> p2.author_id), 0) AS received
            FROM style_posts p2 LEFT JOIN style_votes v2 ON v2.post_id = p2.id
            WHERE p2.hidden = 0 AND p2.author_id <> ''
            GROUP BY p2.author_id""";

    private static final String BADGE_RULE = "(a.received >= " + BADGE_VOTES
            + " OR (a.posts >= " + BADGE_ACTIVE_POSTS + " AND a.received >= " + BADGE_ACTIVE_VOTES + "))";

    /** 이 아이템이 어느 칸에든 들어간 글 */
    private static final String HAS_ITEM = "(p.outer_item = ? OR p.top_item = ? OR p.bottom_item = ? OR p.shoe_item = ? OR p.acc_item = ?)";

    private final JdbcTemplate jdbc;
    private final AuthService auth;
    private volatile boolean schemaReady;

    public StyleVoteController(JdbcTemplate jdbc, AuthService auth) {
        this.jdbc = jdbc;
        this.auth = auth;
    }

    @GetMapping
    public List<StylePost> list(@RequestParam(defaultValue = "wide") String item,
                                @RequestParam(defaultValue = "ALL") String category,
                                @RequestParam(defaultValue = "votes") String sort,
                                @RequestHeader(value = "Authorization", required = false) String authorization) {
        ensureSchema();
        String me = auth.current(authorization).map(AuthService.User::key).orElse("");
        // 이 아이템 페이지에 올라온 글 + 다른 곳에 올라왔어도 이 아이템이 들어간 코디
        List<Object> args = new ArrayList<>(List.of(me, me, me, item, item, item, item, item, item));
        String where = "WHERE p.hidden = 0 AND (p.look_id = ? OR " + HAS_ITEM + ")";
        if (in(CATEGORIES, category)) {
            where += " AND p.category = ?";
            args.add(category);
        }
        String order = "recent".equals(sort) ? "p.id DESC" : "votes DESC, p.id DESC";
        return jdbc.query("""
                SELECT p.*, COUNT(v.post_id) AS votes,
                       COALESCE(MAX(v.voter_id = ?), 0) AS voted,
                       (p.author_id <> '' AND p.author_id = ?) AS mine,
                       EXISTS (SELECT 1 FROM style_reports r WHERE r.post_id = p.id AND r.reporter_id = ?) AS reported,
                       COALESCE(MAX(%s), 0) AS author_badge
                FROM style_posts p
                LEFT JOIN style_votes v ON v.post_id = p.id
                LEFT JOIN (%s) a ON a.author_id = p.author_id
                """.formatted(BADGE_RULE, AUTHOR_STATS) + where + " GROUP BY p.id ORDER BY " + order + " LIMIT 100",
                this::mapPost, args.toArray());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StylePost create(@RequestBody NewPost req,
                            @RequestHeader(value = "Authorization", required = false) String authorization) {
        AuthService.User user = auth.require(authorization);
        ensureSchema();
        if (!StylePalette.isItem(req.item())) throw bad("아이템 정보가 올바르지 않습니다.");
        if (!in(CATEGORIES, req.category())) throw bad("분류가 올바르지 않습니다.");
        String title = trim(req.title(), 40);
        if (title.isEmpty()) throw bad("제목을 입력해 주세요.");
        String comment = trim(req.comment(), 200);
        if ("TIP".equals(req.category()) && comment.isEmpty()) throw bad("팁 내용을 입력해 주세요.");
        if (ProfanityFilter.contains(title, comment)) throw bad("부적절한 표현이 들어 있어요. 고쳐서 다시 올려 주세요.");
        Outfit outfit = outfit(req.category(), req.outfit());
        List<String> colors = outfit != null ? outfitHexes(outfit) : colors(req.colors());
        String gender = in(StylePalette.GENDERS, req.gender()) ? req.gender() : "";
        String age = in(StylePalette.AGES, req.ageGroup()) ? req.ageGroup() : "";

        long id = insert(req.item(), req.category(), title, colors, comment, user.nickname(), user.key(), outfit, gender, age);
        return findForAuthor(id, user.key());
    }

    @PutMapping("/{id}")
    public StylePost edit(@PathVariable long id, @RequestBody EditPost req,
                          @RequestHeader(value = "Authorization", required = false) String authorization) {
        String me = auth.require(authorization).key();
        ensureSchema();
        requireOwner(id, me);
        String title = trim(req.title(), 40);
        if (title.isEmpty()) throw bad("제목을 입력해 주세요.");
        String comment = trim(req.comment(), 200);
        if (ProfanityFilter.contains(title, comment)) throw bad("부적절한 표현이 들어 있어요. 고쳐서 다시 올려 주세요.");
        String category = jdbc.queryForObject("SELECT category FROM style_posts WHERE id = ?", String.class, id);
        Outfit outfit = outfit(category, req.outfit());
        List<String> colors = outfit != null ? outfitHexes(outfit) : colors(req.colors());
        Outfit o = outfit != null ? outfit : new Outfit(Piece.NONE, Piece.NONE, Piece.NONE, Piece.NONE, Piece.NONE);
        jdbc.update("""
                UPDATE style_posts SET title = ?, colors = ?, comment = ?,
                       outer_item = ?, outer_color = ?, top_item = ?, top_color = ?, bottom_item = ?, bottom_color = ?,
                       shoe_item = ?, shoe_color = ?, acc_item = ?, acc_color = ?, updated_at = UTC_TIMESTAMP()
                WHERE id = ?""",
                title, String.join(",", colors), comment,
                o.outer().item(), o.outer().color(), o.top().item(), o.top().color(), o.bottom().item(), o.bottom().color(),
                o.shoes().item(), o.shoes().color(), o.acc().item(), o.acc().color(), id);
        return findForAuthor(id, me);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        String me = auth.require(authorization).key();
        ensureSchema();
        requireOwner(id, me);
        jdbc.update("DELETE FROM style_posts WHERE id = ?", id); // 투표·신고는 FK CASCADE 로 같이 지워진다
    }

    @PostMapping("/{id}/vote")
    public Map<String, Object> vote(@PathVariable long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        String voterId = auth.require(authorization).key();
        ensureSchema();
        requireVisible(id);
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

    @PostMapping("/{id}/report")
    public Map<String, Object> report(@PathVariable long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        String me = auth.require(authorization).key();
        ensureSchema();
        requireVisible(id);
        String author = jdbc.queryForObject("SELECT author_id FROM style_posts WHERE id = ?", String.class, id);
        if (me.equals(author)) throw bad("내 글은 신고할 수 없어요.");
        try {
            jdbc.update("INSERT INTO style_reports (post_id, reporter_id) VALUES (?, ?)", id, me);
        } catch (DuplicateKeyException ignored) {
            // 이미 신고한 글
        }
        Integer reports = jdbc.queryForObject("SELECT COUNT(*) FROM style_reports WHERE post_id = ?", Integer.class, id);
        boolean hidden = reports != null && reports >= REPORTS_TO_HIDE;
        if (hidden) {
            jdbc.update("UPDATE style_posts SET hidden = 1 WHERE id = ?", id);
            log.info("신고 {}건으로 글 {} 숨김", reports, id);
        }
        return Map.of("reported", true, "hidden", hidden);
    }

    @GetMapping("/ranking")
    public List<RankEntry> ranking(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ensureSchema();
        String me = auth.current(authorization).map(AuthService.User::key).orElse("");
        return jdbc.query("""
                SELECT a.posts, a.received, %s AS badge, (a.author_id = ?) AS me,
                       (SELECT x.nickname FROM style_posts x WHERE x.author_id = a.author_id AND x.hidden = 0
                        ORDER BY x.id DESC LIMIT 1) AS nickname
                FROM (%s) a
                WHERE a.received > 0
                ORDER BY a.received DESC, a.posts DESC
                LIMIT 10""".formatted(BADGE_RULE, AUTHOR_STATS),
                (rs, i) -> new RankEntry(i + 1, rs.getString("nickname"), rs.getInt("posts"), rs.getInt("received"),
                        rs.getInt("badge") == 1, rs.getInt("me") == 1),
                me);
    }

    @GetMapping("/stats")
    public Stats stats(@RequestParam(defaultValue = "wide") String item,
                       @RequestParam(defaultValue = "") String gender,
                       @RequestParam(defaultValue = "") String age) {
        ensureSchema();
        List<Object> args = new ArrayList<>(List.of(item, item, item, item, item));
        String where = " WHERE p.hidden = 0 AND p.category = 'OUTFIT' AND " + HAS_ITEM;
        if (!gender.isEmpty() && in(StylePalette.GENDERS, gender)) { where += " AND p.gender = ?"; args.add(gender); }
        if (!age.isEmpty() && in(StylePalette.AGES, age)) { where += " AND p.age_group = ?"; args.add(age); }
        List<WeightedOutfit> outfits = jdbc.query(
                "SELECT p.*, 1 + COUNT(v.post_id) AS weight FROM style_posts p LEFT JOIN style_votes v ON v.post_id = p.id"
                        + where + " GROUP BY p.id",
                (rs, i) -> new WeightedOutfit(rs.getLong("id"), rs.getString("title"), outfitOf(rs), rs.getInt("weight")),
                args.toArray());
        return new Stats(outfits.size(), outfits);
    }

    @GetMapping("/popular")
    public List<WeightedOutfit> popular(@RequestParam(defaultValue = "8") int limit) {
        ensureSchema();
        return jdbc.query("""
                SELECT p.*, 1 + COUNT(v.post_id) AS weight FROM style_posts p LEFT JOIN style_votes v ON v.post_id = p.id
                WHERE p.hidden = 0 AND p.category = 'OUTFIT' GROUP BY p.id ORDER BY weight DESC, p.id DESC LIMIT ?""",
                (rs, i) -> new WeightedOutfit(rs.getLong("id"), rs.getString("title"), outfitOf(rs), rs.getInt("weight")),
                Math.max(1, Math.min(limit, 30)));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        String reason = e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason();
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", reason));
    }

    @ExceptionHandler(DataAccessException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Map<String, String> dbError(DataAccessException e) {
        log.warn("DB 오류: {}", e.getMostSpecificCause().getMessage());
        return Map.of("error", "데이터베이스에 연결할 수 없습니다.");
    }

    /** 처음 요청이 들어올 때 테이블을 만들고, 예전 구조의 DB 면 새 구조로 옮긴 뒤 예시 코디를 넣는다. */
    private void ensureSchema() {
        if (schemaReady) return;
        synchronized (this) {
            if (schemaReady) return;
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS style_posts (
                      id BIGINT AUTO_INCREMENT PRIMARY KEY,
                      look_id VARCHAR(40) NOT NULL,
                      category VARCHAR(10) NOT NULL,
                      title VARCHAR(40) NOT NULL,
                      colors VARCHAR(60) NOT NULL DEFAULT '',
                      comment VARCHAR(200) NOT NULL DEFAULT '',
                      nickname VARCHAR(12) NOT NULL,
                      author_id VARCHAR(64) NOT NULL DEFAULT '',
                      hidden TINYINT NOT NULL DEFAULT 0,
                      outer_item VARCHAR(40) NOT NULL DEFAULT '',
                      outer_color VARCHAR(20) NOT NULL DEFAULT '',
                      top_item VARCHAR(40) NOT NULL DEFAULT '',
                      top_color VARCHAR(20) NOT NULL DEFAULT '',
                      bottom_item VARCHAR(40) NOT NULL DEFAULT '',
                      bottom_color VARCHAR(20) NOT NULL DEFAULT '',
                      shoe_item VARCHAR(40) NOT NULL DEFAULT '',
                      shoe_color VARCHAR(20) NOT NULL DEFAULT '',
                      acc_item VARCHAR(40) NOT NULL DEFAULT '',
                      acc_color VARCHAR(20) NOT NULL DEFAULT '',
                      gender VARCHAR(2) NOT NULL DEFAULT '',
                      age_group VARCHAR(4) NOT NULL DEFAULT '',
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      updated_at DATETIME NULL,
                      INDEX idx_look (look_id, category),
                      INDEX idx_author (author_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            migrate();
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS style_votes (
                      post_id BIGINT NOT NULL,
                      voter_id VARCHAR(64) NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      PRIMARY KEY (post_id, voter_id),
                      FOREIGN KEY (post_id) REFERENCES style_posts(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS style_reports (
                      post_id BIGINT NOT NULL,
                      reporter_id VARCHAR(64) NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      PRIMARY KEY (post_id, reporter_id),
                      FOREIGN KEY (post_id) REFERENCES style_posts(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            Integer seeded = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts WHERE category = 'OUTFIT' AND top_item <> ''", Integer.class);
            if (seeded != null && seeded == 0) {
                // 예전 예시 글(작성자 없음)은 새 구조에 맞는 예시 코디로 바꾼다. 사람들이 쓴 글은 그대로 둔다.
                jdbc.update("DELETE FROM style_posts WHERE author_id = '' AND nickname = 'FYOF'");
                seed();
            }
            schemaReady = true;
            log.info("스타일 코디 테이블 준비 완료");
        }
    }

    /** 1차(데님 3종)·2차 초기 구조로 만들어진 테이블을 지금 구조로 맞춘다. 여러 번 실행해도 결과가 같다. */
    private void migrate() {
        String[][] columns = {
                {"author_id", "VARCHAR(64) NOT NULL DEFAULT ''"}, {"hidden", "TINYINT NOT NULL DEFAULT 0"},
                {"updated_at", "DATETIME NULL"}, {"gender", "VARCHAR(2) NOT NULL DEFAULT ''"}, {"age_group", "VARCHAR(4) NOT NULL DEFAULT ''"},
                {"outer_item", "VARCHAR(40) NOT NULL DEFAULT ''"}, {"outer_color", "VARCHAR(20) NOT NULL DEFAULT ''"},
                {"top_item", "VARCHAR(40) NOT NULL DEFAULT ''"}, {"top_color", "VARCHAR(20) NOT NULL DEFAULT ''"},
                {"bottom_item", "VARCHAR(40) NOT NULL DEFAULT ''"}, {"bottom_color", "VARCHAR(20) NOT NULL DEFAULT ''"},
                {"shoe_item", "VARCHAR(40) NOT NULL DEFAULT ''"}, {"shoe_color", "VARCHAR(20) NOT NULL DEFAULT ''"},
                {"acc_item", "VARCHAR(40) NOT NULL DEFAULT ''"}, {"acc_color", "VARCHAR(20) NOT NULL DEFAULT ''"},
        };
        for (String[] c : columns) addColumnIfMissing(c[0], c[1]);
        widenIfNeeded("look_id", 40, "VARCHAR(40) NOT NULL");
        widenIfNeeded("colors", 60, "VARCHAR(60) NOT NULL DEFAULT ''");
        jdbc.update("UPDATE style_posts SET category = 'OUTFIT' WHERE category = 'COLOR'");
        jdbc.update("UPDATE style_posts SET category = 'TIP' WHERE category = 'ITEM'");
        // 1차 데님 페이지(wide/straight/relaxed)에 올라온 색조합은 그 데님을 하의로 입은 코디
        jdbc.update("UPDATE style_posts SET bottom_item = look_id WHERE category = 'OUTFIT' AND bottom_item = '' AND look_id IN ('wide','straight','relaxed')");
        for (var e : StylePalette.LEGACY.entrySet()) {
            for (String col : List.of("top_color", "bottom_color", "shoe_color")) {
                jdbc.update("UPDATE style_posts SET " + col + " = ? WHERE " + col + " = ?", e.getValue(), e.getKey());
            }
        }
    }

    private void addColumnIfMissing(String column, String definition) {
        Integer exists = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'style_posts' AND COLUMN_NAME = ?""", Integer.class, column);
        if (exists != null && exists == 0) jdbc.execute("ALTER TABLE style_posts ADD COLUMN " + column + " " + definition);
    }

    private void widenIfNeeded(String column, int length, String definition) {
        Integer current = jdbc.queryForObject("""
                SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'style_posts' AND COLUMN_NAME = ?""", Integer.class, column);
        if (current != null && current < length) jdbc.execute("ALTER TABLE style_posts MODIFY " + column + " " + definition);
    }

    /**
     * 처음부터 아이템 페이지가 비어 보이지 않도록 넣는 예시 코디 ("FYOF 예시").
     * 형식: 아우터|상의|하의|신발|액세서리|제목|한마디|성별|연령  (칸은 "아이템:색", 없으면 "-")
     */
    private static final String[] SEEDS = {
            "-|oxford-shirt:white|wide:indigo|loafers:black|-|화이트 셔츠 + 인디고 와이드|가장 깔끔한 정석 조합|F|20s",
            "-|crew-knit:ivory|wide:indigo|loafers:brown|-|아이보리 니트 + 인디고|부드러운 톤온톤|F|30s",
            "-|short-tee:white|wide:indigo|low-sneakers:white|ball-cap:black|화이트 티 + 인디고 와이드|여름 기본|M|20s",
            "blazer:charcoal|short-tee:white|straight:mid-blue|loafers:black|-|차콜 블레이저 + 미드 블루|오피스 캐주얼|M|30s",
            "-|oxford-shirt:white|straight:mid-blue|derby:brown|belt:brown|셔츠 + 스트레이트 데님||M|30s",
            "ma1:black|crop-tee:gray|relaxed:light-blue|low-sneakers:white|-|블랙 항공점퍼 + 워시드 블루|스트릿 무드엔 대비가 핵심|F|20s",
            "hood-zipup:gray|short-tee:white|relaxed:light-blue|running-shoes:gray|-|후드집업 + 릴랙스 데님||M|10s",
            "mustang:brown|turtleneck:ivory|straight:indigo|chelsea-boots:brown|muffler:camel|브라운 무스탕 정석|무스탕엔 터틀넥|F|30s",
            "mustang:black|crew-knit:charcoal|slacks:black|derby:black|-|블랙 무스탕 + 모노톤|시크한 겨울|M|30s",
            "mustang:camel|hoodie:gray|wide:mid-blue|work-boots:brown|beanie:black|카멜 무스탕 + 후드티|캐주얼하게|M|20s",
            "light-padding:black|hoodie:gray|jogger:black|running-shoes:black|backpack:black|경량패딩 + 후드티|편한 등굣길|M|10s",
            "light-padding:navy|oxford-shirt:light-blue|chinos:beige|loafers:brown|-|네이비 경량패딩 + 셔츠|단정한 간절기|M|40s",
            "long-padding:black|hoodie:gray|jogger:gray|ugg-boots:beige|beanie:black|롱패딩 + 조거|한겨울 생존 코디|F|10s",
            "long-padding:beige|crew-knit:ivory|wide:indigo|low-sneakers:white|muffler:camel|베이지 롱패딩 + 아이보리 니트|밝은 겨울|F|20s",
            "short-padding:black|long-sleeve:white|cargo:khaki|high-sneakers:black|beanie:gray|숏패딩 + 카고|비율 좋은 겨울 스트릿|M|20s",
            "short-padding:ivory|turtleneck:black|wide:black|work-boots:black|-|아이보리 숏패딩 + 올블랙||F|20s",
            "hood-zipup:black|long-sleeve:white|cargo:black|high-sneakers:black|ball-cap:black|올블랙 후드집업||M|20s",
            "-|hoodie:navy|slacks:gray|low-sneakers:white|-|후드티 + 슬랙스|편한데 단정하게|M|30s",
            "trench-coat:beige|stripe-shirt:light-blue|straight:indigo|loafers:black|tote-bag:ivory|트렌치 + 스트라이프 셔츠|봄 정석|F|30s",
            "trench-coat:beige|turtleneck:black|slacks:black|chelsea-boots:black|-|베이지 트렌치 + 블랙 터틀넥||F|30s",
            "wool-coat:camel|turtleneck:black|slacks:charcoal|derby:black|muffler:gray|카멜 코트 + 블랙 터틀넥|대비가 예쁜 겨울|M|30s",
            "wool-coat:charcoal|crew-knit:ivory|straight:indigo|loafers:black|-|차콜 코트 + 아이보리 니트||M|40s",
            "wool-coat:black|hoodie:gray|wide:mid-blue|low-sneakers:white|-|블랙 코트 + 후드티|꾸안꾸|M|20s",
            "leather-jacket:black|short-tee:white|skinny:black|chelsea-boots:black|-|가죽 자켓 + 화이트 티|라이더 정석|M|20s",
            "leather-jacket:brown|crew-knit:ivory|straight:mid-blue|work-boots:brown|-|브라운 레더 + 니트||F|30s",
            "denim-jacket:mid-blue|hoodie:gray|slacks:black|low-sneakers:white|-|청자켓 + 후드티|청청 대신 블랙 하의|M|20s",
            "denim-jacket:light-blue|short-tee:white|chinos:beige|low-sneakers:white|bucket-hat:beige|라이트 청자켓 + 베이지||F|20s",
            "windbreaker:black|long-sleeve:white|slacks:black|running-shoes:gray|cross-bag:black|바람막이 + 슬랙스|고프코어|M|20s",
            "fleece:ivory|long-sleeve:white|corduroy:brown|work-boots:brown|beanie:ivory|플리스 + 코듀로이|포근한 주말|F|20s",
            "cardigan:gray|oxford-shirt:white|chinos:beige|loafers:brown|-|그레이 가디건 + 셔츠||M|30s",
            "cardigan:navy|short-tee:white|wide:light-blue|mary-jane:black|-|네이비 가디건 + 라이트 데님||F|20s",
            "field-jacket:khaki|short-tee:white|straight:mid-blue|low-sneakers:white|-|카키 야상 + 화이트 티||M|30s",
            "padding-vest:black|hoodie:gray|cargo:khaki|running-shoes:black|-|패딩 베스트 + 후드티 레이어드||M|20s",
            "-|sweatshirt:gray|wide:indigo|low-sneakers:white|ball-cap:navy|그레이 맨투맨 + 인디고|실패 없는 조합|F|20s",
            "-|half-zip:navy|slacks:gray|loafers:black|-|하프집업 + 슬랙스||M|30s",
            "-|knit-vest:navy|pleated-skirt:gray|mary-jane:black|-|니트 베스트 + 플리츠|프레피 스타일|F|20s",
            "-|polo-shirt:navy|chinos:beige|loafers:brown|belt:brown|폴로 + 치노|여름 출근룩|M|40s",
            "-|linen-shirt:white|shorts:beige|sandals:brown|bucket-hat:beige|린넨 셔츠 + 반바지|시원한 여름|M|30s",
            "-|short-tee:black|shorts:black|slides:black|ball-cap:black|올블랙 여름||M|10s",
            "-|rugby-shirt:navy|straight:light-blue|low-sneakers:white|-|럭비 셔츠 + 라이트 데님|빈티지 무드|M|20s",
            "-|blouse:white|long-skirt:black|loafers:black|tote-bag:black|블라우스 + 롱스커트||F|30s",
            "-|crop-tee:white|wide:mid-blue|low-sneakers:white|cross-bag:black|크롭 티 + 와이드 데님|다리가 길어 보여요|F|10s",
            "-|flannel-shirt:burgundy|cargo:black|work-boots:black|beanie:black|체크 셔츠 + 카고||M|20s",
            "-|denim-shirt:light-blue|slacks:black|loafers:black|-|데님 셔츠 + 블랙 슬랙스||M|30s",
            "blazer:navy|turtleneck:ivory|chinos:beige|loafers:brown|-|네이비 블레이저 + 치노||M|40s",
            "-|sleeveless:white|wide:indigo|slides:black|-|슬리브리스 + 와이드 데님|한여름|F|20s",
            "-|henley:gray|straight:indigo|chelsea-boots:brown|-|헨리넥 + 인디고 데님||M|30s",
            "cardigan:ivory|camisole:black|long-skirt:beige|mary-jane:black|-|가디건 + 캐미솔 레이어드||F|20s",
            "-|stripe-shirt:navy|mini-skirt:indigo|loafers:black|-|스트라이프 셔츠 + 데님 미니||F|20s",
            "ma1:khaki|hoodie:gray|wide:black|high-sneakers:white|-|카키 항공점퍼 + 후드티||M|20s",
            "work-jacket:brown|hoodie:ivory|wide:indigo|work-boots:brown|-|워크 자켓 + 아이보리 후드|워크웨어 무드|M|20s",
            "blazer:black|short-tee:white|track-pants:black|low-sneakers:white|-|블레이저 + 트랙 팬츠|요즘 믹스매치|F|20s",
            "-|long-sleeve:ivory|bootcut:indigo|chelsea-boots:black|belt:black|롱슬리브 + 부츠컷||F|30s",
            "-|sweatshirt:navy|jogger:gray|running-shoes:white|backpack:navy|맨투맨 + 조거|등굣길|M|10s",
            "-|crew-knit:brown|corduroy:beige|loafers:brown|glasses:brown|브라운 니트 + 코듀로이|가을 톤온톤|M|30s",
            "light-padding:beige|turtleneck:ivory|corduroy:brown|loafers:brown|-|베이지 경량패딩 + 코듀로이||F|30s",
            "wool-coat:navy|oxford-shirt:white|slacks:gray|derby:black|-|네이비 코트 + 셔츠|출근 정석|M|40s",
    };

    private void seed() {
        for (String line : SEEDS) {
            String[] f = line.split("\\|", -1);
            Piece[] pieces = new Piece[5];
            for (int i = 0; i < 5; i++) {
                pieces[i] = "-".equals(f[i]) ? Piece.NONE : new Piece(f[i].split(":")[0], f[i].split(":")[1]);
            }
            Outfit outfit = new Outfit(pieces[0], pieces[1], pieces[2], pieces[3], pieces[4]);
            insert(pieces[2].item(), "OUTFIT", f[5], outfitHexes(outfit), f[6], "FYOF 예시", "", outfit, f[7], f[8]);
        }
        log.info("예시 코디 {}개 추가", SEEDS.length);
    }

    private long insert(String item, String category, String title, List<String> colors, String comment, String nickname,
                        String author, Outfit outfit, String gender, String age) {
        Outfit o = outfit != null ? outfit : new Outfit(Piece.NONE, Piece.NONE, Piece.NONE, Piece.NONE, Piece.NONE);
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement("""
                    INSERT INTO style_posts (look_id, category, title, colors, comment, nickname, author_id,
                        outer_item, outer_color, top_item, top_color, bottom_item, bottom_color, shoe_item, shoe_color, acc_item, acc_color,
                        gender, age_group, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())""",
                    java.sql.Statement.RETURN_GENERATED_KEYS);
            String[] values = {item, category, title, String.join(",", colors), comment, nickname, author,
                    o.outer().item(), o.outer().color(), o.top().item(), o.top().color(), o.bottom().item(), o.bottom().color(),
                    o.shoes().item(), o.shoes().color(), o.acc().item(), o.acc().color(), gender, age};
            for (int i = 0; i < values.length; i++) ps.setString(i + 1, values[i]);
            return ps;
        }, keys);
        return keys.getKey().longValue();
    }

    /** 방금 쓰거나 고친 글을 작성자 시점(mine=true)으로 다시 읽는다. */
    private StylePost findForAuthor(long id, String author) {
        return jdbc.queryForObject("""
                SELECT p.*, (SELECT COUNT(*) FROM style_votes v WHERE v.post_id = p.id) AS votes,
                       EXISTS (SELECT 1 FROM style_votes v WHERE v.post_id = p.id AND v.voter_id = ?) AS voted,
                       (p.author_id <> '' AND p.author_id = ?) AS mine, 0 AS reported,
                       COALESCE((SELECT %s FROM (%s) a WHERE a.author_id = p.author_id), 0) AS author_badge
                FROM style_posts p WHERE p.id = ?""".formatted(BADGE_RULE, AUTHOR_STATS),
                this::mapPost, author, author, id);
    }

    private void requireOwner(long id, String me) {
        List<String> author = jdbc.queryForList("SELECT author_id FROM style_posts WHERE id = ?", String.class, id);
        if (author.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
        if (author.get(0).isEmpty() || !author.get(0).equals(me)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "내가 올린 글만 고치거나 지울 수 있어요.");
    }

    private void requireVisible(long id) {
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts WHERE id = ? AND hidden = 0", Integer.class, id);
        if (exists == null || exists == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
    }

    /** OUTFIT 글이면 상의·하의·신발은 필수, 아우터·액세서리는 선택. 칸마다 아이템과 색이 같이 있어야 한다. TIP 글이면 null. */
    private static Outfit outfit(String category, Outfit o) {
        if (!"OUTFIT".equals(category)) return null;
        if (o == null) throw bad("코디를 골라 주세요.");
        return new Outfit(piece(o.outer(), "아우터", false), piece(o.top(), "상의", true), piece(o.bottom(), "하의", true),
                piece(o.shoes(), "신발", true), piece(o.acc(), "액세서리", false));
    }

    private static Piece piece(Piece p, String label, boolean required) {
        String item = p == null || p.item() == null ? "" : p.item();
        String color = p == null || p.color() == null ? "" : p.color();
        if (item.isEmpty() && color.isEmpty()) {
            if (required) throw bad(label + "을(를) 골라 주세요.");
            return Piece.NONE;
        }
        if (!StylePalette.isItem(item)) throw bad(label + " 아이템을 골라 주세요.");
        if (!StylePalette.isColor(color)) throw bad(label + " 색을 골라 주세요.");
        return new Piece(item, color);
    }

    private static List<String> outfitHexes(Outfit o) {
        return List.of(o.outer(), o.top(), o.bottom(), o.shoes(), o.acc()).stream()
                .filter(p -> !p.empty()).map(p -> StylePalette.COLORS.get(p.color())).toList();
    }

    static Outfit outfitOf(ResultSet rs) throws SQLException {
        return new Outfit(
                new Piece(rs.getString("outer_item"), rs.getString("outer_color")),
                new Piece(rs.getString("top_item"), rs.getString("top_color")),
                new Piece(rs.getString("bottom_item"), rs.getString("bottom_color")),
                new Piece(rs.getString("shoe_item"), rs.getString("shoe_color")),
                new Piece(rs.getString("acc_item"), rs.getString("acc_color")));
    }

    private static List<String> splitColors(String colors) {
        return colors == null || colors.isEmpty() ? List.of() : Arrays.asList(colors.split(","));
    }

    private static List<String> colors(List<String> colors) {
        return colors == null ? List.of()
                : colors.stream().filter(c -> c != null && HEX.matcher(c).matches()).limit(3).toList();
    }

    private StylePost mapPost(ResultSet rs, int row) throws SQLException {
        String category = rs.getString("category");
        return new StylePost(
                rs.getLong("id"),
                rs.getString("look_id"),
                category,
                rs.getString("title"),
                splitColors(rs.getString("colors")),
                rs.getString("comment"),
                rs.getString("nickname"),
                // UTC 로 저장한 값을 시간대 변환 없이 그대로 읽어 ISO(UTC) 문자열로 돌려준다.
                rs.getString("created_at").replace(' ', 'T') + "Z",
                rs.getString("updated_at") != null,
                "OUTFIT".equals(category) ? outfitOf(rs) : null,
                rs.getInt("votes"),
                rs.getInt("voted") == 1,
                rs.getInt("mine") == 1,
                rs.getInt("reported") == 1,
                rs.getInt("author_badge") == 1);
    }

    /** Set.of(...).contains(null) 은 예외를 던지므로, 빠진 값(null)은 "목록에 없음"으로 본다. */
    private static boolean in(Set<String> allowed, String value) {
        return value != null && allowed.contains(value);
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
