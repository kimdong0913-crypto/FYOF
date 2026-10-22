package com.kdh.demo;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * 나만의 옷장: 찜한 상품과 저장한 피팅 결과. 모두 로그인이 필요하다.
 *   GET    /api/closet                    -> { items: [{ productId, savedAt }], fits: [{ id, productId, ai, savedAt }] }
 *   PUT    /api/closet/items/{productId}  -> 찜하기
 *   DELETE /api/closet/items/{productId}  -> 찜 해제
 *   POST   /api/closet/fits               (multipart: image, productId, ai) -> 피팅 결과 저장
 *   GET    /api/closet/fits/{id}/image    -> image/png
 *   DELETE /api/closet/fits/{id}
 *   GET    /api/closet/outfits            -> 내 옷장 아이템만으로 입을 수 있는 인기 코디
 * 상품 목록은 프론트(catalog.ts)에 있으므로 서버는 상품 id 형식만 확인한다.
 */
@RestController
@RequestMapping("/api/closet")
public class ClosetController {

    private static final Pattern PRODUCT_ID = Pattern.compile("^[a-z0-9-]{1,40}$");
    private static final int MAX_FITS = 30;
    private static final long MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    public record ClosetItem(String productId, String savedAt) {}

    public record ClosetFit(long id, String productId, boolean ai, String savedAt) {}

    public record Closet(List<ClosetItem> items, List<ClosetFit> fits) {}

    private final JdbcTemplate jdbc;
    private final AuthService auth;
    private volatile boolean schemaReady;

    public ClosetController(JdbcTemplate jdbc, AuthService auth) {
        this.jdbc = jdbc;
        this.auth = auth;
    }

    @GetMapping
    public Closet closet(@RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        List<ClosetItem> items = jdbc.query("SELECT product_id, created_at FROM closet_items WHERE user_id = ? ORDER BY created_at DESC",
                (rs, i) -> new ClosetItem(rs.getString("product_id"), iso(rs.getString("created_at"))), user);
        List<ClosetFit> fits = jdbc.query("SELECT id, product_id, ai, created_at FROM closet_fits WHERE user_id = ? ORDER BY id DESC",
                (rs, i) -> new ClosetFit(rs.getLong("id"), rs.getString("product_id"), rs.getBoolean("ai"), iso(rs.getString("created_at"))), user);
        return new Closet(items, fits);
    }

    @PutMapping("/items/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(@PathVariable String productId, @RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        try {
            jdbc.update("INSERT INTO closet_items (user_id, product_id, created_at) VALUES (?, ?, UTC_TIMESTAMP())", user, product(productId));
        } catch (DuplicateKeyException ignored) {
            // 이미 찜한 상품
        }
    }

    @DeleteMapping("/items/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsave(@PathVariable String productId, @RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        jdbc.update("DELETE FROM closet_items WHERE user_id = ? AND product_id = ?", user, product(productId));
    }

    @PostMapping("/fits")
    @ResponseStatus(HttpStatus.CREATED)
    public ClosetFit saveFit(@RequestParam("image") MultipartFile image,
                             @RequestParam("productId") String productId,
                             @RequestParam(defaultValue = "false") boolean ai,
                             @RequestHeader(value = "Authorization", required = false) String authorization) throws IOException {
        long user = auth.require(authorization).id();
        ensureSchema();
        if (image.isEmpty()) throw bad("이미지가 비어 있어요.");
        if (image.getSize() > MAX_IMAGE_BYTES) throw bad("이미지가 너무 커요 (8MB 이하).");
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM closet_fits WHERE user_id = ?", Integer.class, user);
        if (count != null && count >= MAX_FITS) throw bad("피팅 결과는 " + MAX_FITS + "개까지 저장할 수 있어요. 오래된 것을 지워 주세요.");

        String pid = product(productId);
        var keys = new org.springframework.jdbc.support.GeneratedKeyHolder();
        byte[] bytes = image.getBytes();
        jdbc.update(con -> {
            var ps = con.prepareStatement("INSERT INTO closet_fits (user_id, product_id, ai, image, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())",
                    java.sql.Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, user);
            ps.setString(2, pid);
            ps.setBoolean(3, ai);
            ps.setBytes(4, bytes);
            return ps;
        }, keys);
        long id = keys.getKey().longValue();
        return jdbc.queryForObject("SELECT id, product_id, ai, created_at FROM closet_fits WHERE id = ?",
                (rs, i) -> new ClosetFit(rs.getLong("id"), rs.getString("product_id"), rs.getBoolean("ai"), iso(rs.getString("created_at"))), id);
    }

    @GetMapping("/fits/{id}/image")
    public ResponseEntity<byte[]> fitImage(@PathVariable long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        List<byte[]> image = jdbc.query("SELECT image FROM closet_fits WHERE id = ? AND user_id = ?", (rs, i) -> rs.getBytes("image"), id, user);
        if (image.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "피팅 결과를 찾을 수 없어요.");
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(image.get(0));
    }

    @DeleteMapping("/fits/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFit(@PathVariable long id, @RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        jdbc.update("DELETE FROM closet_fits WHERE id = ? AND user_id = ?", id, user);
    }

    @GetMapping("/outfits")
    public List<StyleVoteController.WeightedOutfit> outfits(@RequestHeader(value = "Authorization", required = false) String authorization) {
        long user = auth.require(authorization).id();
        ensureSchema();
        // 상의·하의·신발이 모두 내 옷장에 있고, 아우터·액세서리는 없거나 내 옷장에 있는 코디
        String mine = "(SELECT product_id FROM closet_items WHERE user_id = ?)";
        try {
            return jdbc.query("""
                    SELECT p.*, 1 + COUNT(v.post_id) AS weight FROM style_posts p LEFT JOIN style_votes v ON v.post_id = p.id
                    WHERE p.hidden = 0 AND p.category = 'OUTFIT'
                      AND p.top_item IN %1$s AND p.bottom_item IN %1$s AND p.shoe_item IN %1$s
                      AND (p.outer_item = '' OR p.outer_item IN %1$s) AND (p.acc_item = '' OR p.acc_item IN %1$s)
                    GROUP BY p.id ORDER BY weight DESC, p.id DESC LIMIT 12""".formatted(mine),
                    (rs, i) -> new StyleVoteController.WeightedOutfit(rs.getLong("id"), rs.getString("title"),
                            StyleVoteController.outfitOf(rs), rs.getInt("weight")),
                    user, user, user, user, user);
        } catch (org.springframework.jdbc.BadSqlGrammarException e) {
            return List.of(); // 코디 테이블이 아직 없으면(커뮤니티를 한 번도 안 열었으면) 빈 목록
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason()));
    }

    private static String product(String productId) {
        if (productId == null || !PRODUCT_ID.matcher(productId).matches()) throw bad("상품 정보가 올바르지 않아요.");
        return productId;
    }

    private static String iso(String datetime) {
        return datetime.replace(' ', 'T') + "Z";
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private void ensureSchema() {
        if (schemaReady) return;
        synchronized (this) {
            if (schemaReady) return;
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS closet_items (
                      user_id BIGINT NOT NULL,
                      product_id VARCHAR(40) NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      PRIMARY KEY (user_id, product_id),
                      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS closet_fits (
                      id BIGINT AUTO_INCREMENT PRIMARY KEY,
                      user_id BIGINT NOT NULL,
                      product_id VARCHAR(40) NOT NULL,
                      ai TINYINT NOT NULL DEFAULT 0,
                      image MEDIUMBLOB NOT NULL,
                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      INDEX idx_user (user_id),
                      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""");
            // 핏별로 나뉘어 있던 아이템을 합친 뒤의 id 로 옮긴다 (와이드 데님 -> 데님 팬츠). 이미 담긴 아이템과 겹치면 예전 것은 지운다.
            for (String[] m : StyleVoteController.MERGED) {
                jdbc.update("UPDATE IGNORE closet_items SET product_id = ? WHERE product_id = ?", m[1], m[0]);
                jdbc.update("DELETE FROM closet_items WHERE product_id = ?", m[0]);
                jdbc.update("UPDATE closet_fits SET product_id = ? WHERE product_id = ?", m[1], m[0]);
            }
            schemaReady = true;
        }
    }
}
