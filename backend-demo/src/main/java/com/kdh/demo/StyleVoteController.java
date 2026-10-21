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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * STYLE INDEX 커뮤니티 투표. 사람들이 어울리는 색조합/패션 아이템을 하나씩 올리고 투표한다.
 *   GET    /api/style-posts?lookId=wide&category=ALL|COLOR|ITEM&sort=votes|recent&voterId=...
 *   POST   /api/style-posts               { lookId, category, title, colors[], comment, nickname, voterId }
 *   PUT    /api/style-posts/{id}          { voterId, title, colors[], comment }   -> 본인 글만
 *   DELETE /api/style-posts/{id}?voterId=...                                     -> 본인 글만
 *   POST   /api/style-posts/{id}/vote     { voterId }  -> 투표 토글 { votes, voted }
 *   POST   /api/style-posts/{id}/report   { voterId }  -> 신고 { reported, hidden }
 *   GET    /api/style-posts/ranking?voterId=...         -> 추천을 많이 받은 사람 순위
 *   GET    /api/style-posts/stats?lookId=wide&gender=&age= -> STYLE DATA 집계 (색조합별 비중, 인기 아이템)
 * 색조합(COLOR) 글은 데님/상의/신발 색을 StylePalette 목록에서 하나씩 골라야 집계할 수 있다.
 * 로그인이 없으므로 브라우저마다 만든 voterId 로 작성자와 투표자를 구분한다.
 * voterId 는 본인 확인용이라 응답에는 절대 내보내지 않고 mine/me 같은 true/false 로만 알려준다.
 */
@RestController
@RequestMapping("/api/style-posts")
public class StyleVoteController {

    private static final Logger log = LoggerFactory.getLogger(StyleVoteController.class);
    private static final Set<String> LOOKS = Set.of("wide", "straight", "relaxed");
    private static final Set<String> CATEGORIES = Set.of("COLOR", "ITEM");
    private static final Pattern HEX = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    /** 신고가 이만큼 쌓이면 글을 숨긴다. */
    static final int REPORTS_TO_HIDE = 3;
    /** 패셔니스타 뱃지: 추천을 10개 이상 받거나, 글 5개 이상 + 추천 3개 이상 (본인 추천은 제외). */
    static final int BADGE_VOTES = 10;
    static final int BADGE_ACTIVE_POSTS = 5;
    static final int BADGE_ACTIVE_VOTES = 3;

    public record StylePost(long id, String lookId, String category, String title, List<String> colors,
                            String comment, String nickname, String createdAt, boolean edited,
                            String bottomColor, String topColor, String shoeColor,
                            int votes, boolean voted, boolean mine, boolean reported, boolean authorBadge) {}

    public record NewPost(String lookId, String category, String title, List<String> colors, String comment,
                          String nickname, String voterId,
                          String bottomColor, String topColor, String shoeColor, String gender, String ageGroup) {}

    public record EditPost(String voterId, String title, List<String> colors, String comment,
                           String bottomColor, String topColor, String shoeColor) {}

    /** 색조합 하나와 그 비중(글 1개 = 1, 받은 추천 1개 = 1). */
    public record Combo(String bottom, String top, String shoe, int weight) {}

    public record Item(String title, List<String> colors, int weight) {}

    public record Stats(int posts, List<Combo> combos, List<Item> items) {}

    private record Slots(String bottom, String top, String shoe) {}

    public record VoteRequest(String voterId) {}

    public record RankEntry(int rank, String nickname, int posts, int votes, boolean badge, boolean me) {}

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
        String me = trim(voterId, 64);
        List<Object> args = new ArrayList<>(List.of(me, me, me, lookId));
        String where = "WHERE p.look_id = ? AND p.hidden = 0";
        if (CATEGORIES.contains(category)) {
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
    public StylePost create(@RequestBody NewPost req) {
        ensureSchema();
        String lookId = LOOKS.contains(req.lookId()) ? req.lookId() : "wide";
        if (!CATEGORIES.contains(req.category())) throw bad("분류가 올바르지 않습니다.");
        String title = trim(req.title(), 40);
        if (title.isEmpty()) throw bad("조합 이름을 입력해 주세요.");
        List<String> colors = colors(req.colors());
        String comment = trim(req.comment(), 200);
        String nickname = trim(req.nickname(), 12);
        if (nickname.isEmpty()) nickname = "익명";
        if (ProfanityFilter.contains(title, comment, nickname)) throw bad("부적절한 표현이 들어 있어요. 고쳐서 다시 올려 주세요.");
        String author = trim(req.voterId(), 64);
        Slots slots = slots(req.category(), req.bottomColor(), req.topColor(), req.shoeColor());
        if (slots != null) colors = slotHexes(slots);
        String gender = StylePalette.GENDERS.contains(req.gender()) ? req.gender() : "";
        String age = StylePalette.AGES.contains(req.ageGroup()) ? req.ageGroup() : "";

        long id = insert(lookId, req.category(), title, colors, comment, nickname, author, slots, gender, age);
        return findForAuthor(id, author);
    }

    @PutMapping("/{id}")
    public StylePost edit(@PathVariable long id, @RequestBody EditPost req) {
        ensureSchema();
        String me = requireVoter(req.voterId());
        requireOwner(id, me);
        String title = trim(req.title(), 40);
        if (title.isEmpty()) throw bad("조합 이름을 입력해 주세요.");
        String comment = trim(req.comment(), 200);
        if (ProfanityFilter.contains(title, comment)) throw bad("부적절한 표현이 들어 있어요. 고쳐서 다시 올려 주세요.");
        String category = jdbc.queryForObject("SELECT category FROM style_posts WHERE id = ?", String.class, id);
        Slots slots = slots(category, req.bottomColor(), req.topColor(), req.shoeColor());
        List<String> colors = slots != null ? slotHexes(slots) : colors(req.colors());
        jdbc.update("""
                UPDATE style_posts SET title = ?, colors = ?, comment = ?, bottom_color = ?, top_color = ?, shoe_color = ?,
                       updated_at = UTC_TIMESTAMP() WHERE id = ?""",
                title, String.join(",", colors), comment,
                slots == null ? "" : slots.bottom(), slots == null ? "" : slots.top(), slots == null ? "" : slots.shoe(), id);
        return findForAuthor(id, me);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id, @RequestParam(defaultValue = "") String voterId) {
        ensureSchema();
        String me = requireVoter(voterId);
        requireOwner(id, me);
        jdbc.update("DELETE FROM style_posts WHERE id = ?", id); // 투표·신고는 FK CASCADE 로 같이 지워진다
    }

    @PostMapping("/{id}/vote")
    public Map<String, Object> vote(@PathVariable long id, @RequestBody VoteRequest req) {
        ensureSchema();
        String voterId = requireVoter(req.voterId());
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
    public Map<String, Object> report(@PathVariable long id, @RequestBody VoteRequest req) {
        ensureSchema();
        String me = requireVoter(req.voterId());
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
    public List<RankEntry> ranking(@RequestParam(defaultValue = "") String voterId) {
        ensureSchema();
        String me = trim(voterId, 64);
        List<RankEntry> rows = jdbc.query("""
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
        return rows;
    }

    @GetMapping("/stats")
    public Stats stats(@RequestParam(defaultValue = "wide") String lookId,
                       @RequestParam(defaultValue = "") String gender,
                       @RequestParam(defaultValue = "") String age) {
        ensureSchema();
        List<Object> args = new ArrayList<>(List.of(lookId));
        String filter = "";
        if (!gender.isEmpty() && StylePalette.GENDERS.contains(gender)) { filter += " AND p.gender = ?"; args.add(gender); }
        if (!age.isEmpty() && StylePalette.AGES.contains(age)) { filter += " AND p.age_group = ?"; args.add(age); }
        String colorPosts = " WHERE p.look_id = ? AND p.hidden = 0 AND p.category = 'COLOR' AND p.bottom_color <> ''" + filter;

        List<Combo> combos = jdbc.query(
                "SELECT p.bottom_color, p.top_color, p.shoe_color, COUNT(DISTINCT p.id) AS posts, COUNT(v.post_id) AS votes"
                        + " FROM style_posts p LEFT JOIN style_votes v ON v.post_id = p.id" + colorPosts
                        + " GROUP BY p.bottom_color, p.top_color, p.shoe_color",
                (rs, i) -> new Combo(rs.getString("bottom_color"), rs.getString("top_color"), rs.getString("shoe_color"),
                        rs.getInt("posts") + rs.getInt("votes")),
                args.toArray());
        Integer posts = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts p" + colorPosts, Integer.class, args.toArray());
        List<Item> items = jdbc.query(
                "SELECT p.title, p.colors, 1 + COUNT(v.post_id) AS weight"
                        + " FROM style_posts p LEFT JOIN style_votes v ON v.post_id = p.id"
                        + " WHERE p.look_id = ? AND p.hidden = 0 AND p.category = 'ITEM'" + filter
                        + " GROUP BY p.id ORDER BY weight DESC, p.id DESC LIMIT 6",
                (rs, i) -> new Item(rs.getString("title"), splitColors(rs.getString("colors")), rs.getInt("weight")),
                args.toArray());
        return new Stats(posts == null ? 0 : posts, combos, items);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        String reason = e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason();
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", reason));
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
                      author_id VARCHAR(64) NOT NULL DEFAULT '',
                      hidden TINYINT NOT NULL DEFAULT 0,
                      bottom_color VARCHAR(20) NOT NULL DEFAULT '',
                      top_color VARCHAR(20) NOT NULL DEFAULT '',
                      shoe_color VARCHAR(20) NOT NULL DEFAULT '',
                      gender VARCHAR(2) NOT NULL DEFAULT '',
                      age_group VARCHAR(4) NOT NULL DEFAULT '',
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      updated_at DATETIME NULL,
                      INDEX idx_look (look_id, category),
                      INDEX idx_author (author_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            // 1차 때 만든 테이블에는 아래 칸이 없어서 없으면 추가한다.
            addColumnIfMissing("author_id", "VARCHAR(64) NOT NULL DEFAULT ''");
            addColumnIfMissing("hidden", "TINYINT NOT NULL DEFAULT 0");
            addColumnIfMissing("updated_at", "DATETIME NULL");
            addColumnIfMissing("bottom_color", "VARCHAR(20) NOT NULL DEFAULT ''");
            addColumnIfMissing("top_color", "VARCHAR(20) NOT NULL DEFAULT ''");
            addColumnIfMissing("shoe_color", "VARCHAR(20) NOT NULL DEFAULT ''");
            addColumnIfMissing("gender", "VARCHAR(2) NOT NULL DEFAULT ''");
            addColumnIfMissing("age_group", "VARCHAR(4) NOT NULL DEFAULT ''");
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
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts", Integer.class);
            if (count != null && count == 0) seed();
            Integer combos = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts WHERE category = 'COLOR' AND bottom_color <> ''", Integer.class);
            if (combos != null && combos == 0) seedCombos();
            schemaReady = true;
            log.info("Cloud SQL 스타일 투표 테이블 준비 완료");
        }
    }

    private void addColumnIfMissing(String column, String definition) {
        Integer exists = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'style_posts' AND COLUMN_NAME = ?""", Integer.class, column);
        if (exists != null && exists == 0) jdbc.execute("ALTER TABLE style_posts ADD COLUMN " + column + " " + definition);
    }

    private void seed() {
        insert("wide", "ITEM", "블랙 로퍼", List.of("#2E2E2E"), "와이드 핏 밑단이 로퍼에 자연스럽게 떨어져요", "FYOF", "");
        insert("wide", "ITEM", "테일러드 재킷", List.of("#4A4A4A"), "", "FYOF", "");
        insert("straight", "ITEM", "오버핏 블레이저", List.of("#4A4A4A"), "", "FYOF", "");
        insert("relaxed", "ITEM", "화이트 스니커즈", List.of("#F1F0EC"), "", "FYOF", "");
    }

    /** STYLE DATA 가 처음부터 비어 보이지 않도록 넣는 예시 색조합. 실제 글이 쌓이면 비중이 그만큼 줄어든다. */
    private void seedCombos() {
        String[][] combos = {
                {"wide", "indigo", "white", "black", "화이트 셔츠 + 인디고", "가장 깔끔한 정석 조합"},
                {"wide", "indigo", "beige", "brown", "베이지 니트 + 인디고", "부드러운 톤온톤"},
                {"wide", "indigo", "white", "white", "올 화이트 포인트", ""},
                {"wide", "mid-blue", "navy", "white", "네이비 + 미드 블루", ""},
                {"wide", "black-denim", "charcoal", "black", "차콜 + 블랙 데님", "시크한 모노톤"},
                {"straight", "mid-blue", "charcoal", "black", "차콜 블레이저 + 미드 블루", "오피스룩으로도 무난"},
                {"straight", "mid-blue", "white", "brown", "화이트 + 미드 블루", ""},
                {"straight", "indigo", "gray", "black", "그레이 + 인디고", ""},
                {"straight", "ecru", "navy", "brown", "네이비 + 에크루", "봄 느낌"},
                {"relaxed", "light-blue", "black", "white", "블랙 + 워시드 블루", "스트릿 무드엔 대비가 핵심"},
                {"relaxed", "light-blue", "white", "white", "화이트 + 라이트 블루", ""},
                {"relaxed", "gray-denim", "khaki", "black", "카키 + 그레이 데님", ""},
                {"relaxed", "black-denim", "burgundy", "black", "버건디 포인트", ""},
        };
        for (String[] c : combos) {
            Slots slots = new Slots(c[1], c[2], c[3]);
            insert(c[0], "COLOR", c[4], slotHexes(slots), c[5], "FYOF", "", slots, "", "");
        }
    }

    private long insert(String lookId, String category, String title, List<String> colors, String comment, String nickname, String author) {
        return insert(lookId, category, title, colors, comment, nickname, author, null, "", "");
    }

    private long insert(String lookId, String category, String title, List<String> colors, String comment, String nickname, String author,
                        Slots slots, String gender, String age) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement(
                    """
                    INSERT INTO style_posts (look_id, category, title, colors, comment, nickname, author_id,
                                             bottom_color, top_color, shoe_color, gender, age_group, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())""",
                    java.sql.Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, lookId);
            ps.setString(2, category);
            ps.setString(3, title);
            ps.setString(4, String.join(",", colors));
            ps.setString(5, comment);
            ps.setString(6, nickname);
            ps.setString(7, author);
            ps.setString(8, slots == null ? "" : slots.bottom());
            ps.setString(9, slots == null ? "" : slots.top());
            ps.setString(10, slots == null ? "" : slots.shoe());
            ps.setString(11, gender);
            ps.setString(12, age);
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
        if (author.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "의견을 찾을 수 없습니다.");
        if (author.get(0).isEmpty() || !author.get(0).equals(me)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "내가 올린 글만 고치거나 지울 수 있어요.");
    }

    private void requireVisible(long id) {
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM style_posts WHERE id = ? AND hidden = 0", Integer.class, id);
        if (exists == null || exists == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "의견을 찾을 수 없습니다.");
    }

    private static String requireVoter(String voterId) {
        String id = trim(voterId, 64);
        if (id.isEmpty()) throw bad("voterId 가 필요합니다.");
        return id;
    }

    /** COLOR 글이면 세 칸이 모두 팔레트 안의 색인지 확인한다. ITEM 글이면 null. */
    private static Slots slots(String category, String bottom, String top, String shoe) {
        if (!"COLOR".equals(category)) return null;
        if (bottom == null || !StylePalette.DENIM.containsKey(bottom)) throw bad("데님 색을 골라 주세요.");
        if (top == null || !StylePalette.WEAR.containsKey(top)) throw bad("상의 색을 골라 주세요.");
        if (shoe == null || !StylePalette.WEAR.containsKey(shoe)) throw bad("신발 색을 골라 주세요.");
        return new Slots(bottom, top, shoe);
    }

    private static List<String> slotHexes(Slots s) {
        return List.of(StylePalette.DENIM.get(s.bottom()), StylePalette.WEAR.get(s.top()), StylePalette.WEAR.get(s.shoe()));
    }

    private static List<String> splitColors(String colors) {
        return colors == null || colors.isEmpty() ? List.of() : Arrays.asList(colors.split(","));
    }

    private static List<String> colors(List<String> colors) {
        return colors == null ? List.of()
                : colors.stream().filter(c -> c != null && HEX.matcher(c).matches()).limit(3).toList();
    }

    private StylePost mapPost(ResultSet rs, int row) throws SQLException {
        return new StylePost(
                rs.getLong("id"),
                rs.getString("look_id"),
                rs.getString("category"),
                rs.getString("title"),
                splitColors(rs.getString("colors")),
                rs.getString("comment"),
                rs.getString("nickname"),
                // UTC 로 저장한 값을 시간대 변환 없이 그대로 읽어 ISO(UTC) 문자열로 돌려준다.
                rs.getString("created_at").replace(' ', 'T') + "Z",
                rs.getString("updated_at") != null,
                rs.getString("bottom_color"),
                rs.getString("top_color"),
                rs.getString("shoe_color"),
                rs.getInt("votes"),
                rs.getInt("voted") == 1,
                rs.getInt("mine") == 1,
                rs.getInt("reported") == 1,
                rs.getInt("author_badge") == 1);
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
