package com.kdh.demo;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 게시물 댓글. 누구나 읽고, 로그인하면 쓸 수 있다. 댓글은 쓴 사람이나 그 글의 작성자가 지울 수 있다.
 *   GET    /api/style-posts/{postId}/comments               -> 오래된 순 댓글 목록
 *   POST   /api/style-posts/{postId}/comments  (로그인)     { text } -> 방금 쓴 댓글
 *   DELETE /api/style-posts/{postId}/comments/{commentId}  (댓글 작성자 또는 글 작성자)
 * 닉네임은 저장하지 않고 users 에서 읽어서, 닉네임을 바꾸면 예전 댓글에도 바로 반영된다.
 */
@RestController
@RequestMapping("/api/style-posts/{postId}/comments")
public class CommentController {

    private static final Logger log = LoggerFactory.getLogger(CommentController.class);
    private static final int MAX_LENGTH = 200;

    /** mine: 내가 쓴 댓글, canDelete: 내가 지울 수 있는 댓글(내 댓글이거나 내 글에 달린 댓글) */
    public record Comment(long id, Long userId, String nickname, String text, String createdAt, boolean mine, boolean canDelete) {}

    public record NewComment(String text) {}

    private final JdbcTemplate jdbc;
    private final AuthService auth;
    private final StyleVoteController posts;

    public CommentController(JdbcTemplate jdbc, AuthService auth, StyleVoteController posts) {
        this.jdbc = jdbc;
        this.auth = auth;
        this.posts = posts;
    }

    @GetMapping
    public List<Comment> list(@PathVariable long postId, @RequestHeader(value = "Authorization", required = false) String authorization) {
        posts.ensureSchema();
        String me = auth.current(authorization).map(AuthService.User::key).orElse("");
        String postAuthor = requireVisible(postId);
        return jdbc.query("""
                SELECT c.id, c.author_id, c.body, c.created_at, u.id AS user_id, u.nickname
                FROM post_comments c LEFT JOIN users u ON CONCAT('u:', u.id) = c.author_id
                WHERE c.post_id = ? ORDER BY c.id LIMIT 300""",
                (rs, i) -> map(rs, me, postAuthor), postId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Comment create(@PathVariable long postId, @RequestBody NewComment req,
                          @RequestHeader(value = "Authorization", required = false) String authorization) {
        AuthService.User user = auth.require(authorization);
        posts.ensureSchema();
        String postAuthor = requireVisible(postId);
        String text = req.text() == null ? "" : req.text().strip();
        if (text.isEmpty()) throw bad("댓글 내용을 입력해 주세요.");
        if (text.length() > MAX_LENGTH) throw bad("댓글은 " + MAX_LENGTH + "자까지 쓸 수 있어요.");
        if (ProfanityFilter.contains(text)) throw bad("부적절한 표현이 들어 있어요. 고쳐서 다시 올려 주세요.");
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement("INSERT INTO post_comments (post_id, author_id, body, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())",
                    java.sql.Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, postId);
            ps.setString(2, user.key());
            ps.setString(3, text);
            return ps;
        }, keys);
        long id = keys.getKey().longValue();
        return jdbc.queryForObject("""
                SELECT c.id, c.author_id, c.body, c.created_at, u.id AS user_id, u.nickname
                FROM post_comments c LEFT JOIN users u ON CONCAT('u:', u.id) = c.author_id WHERE c.id = ?""",
                (rs, i) -> map(rs, user.key(), postAuthor), id);
    }

    @DeleteMapping("/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long postId, @PathVariable long commentId,
                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        String me = auth.require(authorization).key();
        posts.ensureSchema();
        List<String> author = jdbc.queryForList("SELECT author_id FROM post_comments WHERE id = ? AND post_id = ?", String.class, commentId, postId);
        if (author.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "댓글을 찾을 수 없어요.");
        String postAuthor = jdbc.queryForObject("SELECT author_id FROM style_posts WHERE id = ?", String.class, postId);
        if (!me.equals(author.get(0)) && !me.equals(postAuthor))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "내 댓글이나 내 글에 달린 댓글만 지울 수 있어요.");
        jdbc.update("DELETE FROM post_comments WHERE id = ?", commentId);
    }

    /** 숨겨지지 않은 글인지 확인하고, 그 글의 작성자("u:번호", 예시 글이면 "")를 돌려준다. */
    private String requireVisible(long postId) {
        List<String> author = jdbc.queryForList("SELECT author_id FROM style_posts WHERE id = ? AND hidden = 0", String.class, postId);
        if (author.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
        return author.get(0);
    }

    private static Comment map(ResultSet rs, String me, String postAuthor) throws SQLException {
        String author = rs.getString("author_id");
        boolean mine = !me.isEmpty() && me.equals(author);
        String nickname = rs.getString("nickname");
        return new Comment(rs.getLong("id"), (Long) rs.getObject("user_id", Long.class),
                nickname == null || nickname.isEmpty() ? "알 수 없음" : nickname, rs.getString("body"),
                // UTC 로 저장한 값을 그대로 ISO(UTC) 문자열로
                rs.getString("created_at").replace(' ', 'T') + "Z",
                mine, mine || (!me.isEmpty() && me.equals(postAuthor)));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason()));
    }

    @ExceptionHandler(DataAccessException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Map<String, String> dbError(DataAccessException e) {
        log.warn("DB 오류: {}", e.getMostSpecificCause().getMessage());
        return Map.of("error", "데이터베이스에 연결할 수 없습니다.");
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
