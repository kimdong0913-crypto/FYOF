package com.kdh.demo;

import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 회원가입·로그인.
 *   POST /api/auth/signup  { username, password, nickname } -> { token, user }
 *   POST /api/auth/login   { username, password }           -> { token, user }
 *   POST /api/auth/logout  (Authorization 헤더)
 *   GET  /api/auth/me      (Authorization 헤더)             -> user
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9_]{4,20}$");

    public record SignupRequest(String username, String password, String nickname) {}

    public record LoginRequest(String username, String password) {}

    public record UserView(String username, String nickname) {}

    public record Session(String token, UserView user) {}

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public Session signup(@RequestBody SignupRequest req) {
        String username = req.username() == null ? "" : req.username().strip().toLowerCase();
        if (!USERNAME.matcher(username).matches()) throw bad("아이디는 영문 소문자·숫자·_ 로 4~20자예요.");
        String password = req.password() == null ? "" : req.password();
        if (password.length() < 8 || password.length() > 64) throw bad("비밀번호는 8자 이상이어야 해요.");
        String nickname = req.nickname() == null ? "" : req.nickname().strip();
        if (nickname.isEmpty() || nickname.length() > 12) throw bad("닉네임은 1~12자로 정해 주세요.");
        if (ProfanityFilter.contains(username, nickname)) throw bad("부적절한 표현은 쓸 수 없어요.");

        AuthService.User user = auth.signup(username, password, nickname);
        return new Session(auth.createSession(user), view(user));
    }

    @PostMapping("/login")
    public Session login(@RequestBody LoginRequest req) {
        String username = req.username() == null ? "" : req.username().strip().toLowerCase();
        AuthService.User user = auth.login(username, req.password() == null ? "" : req.password());
        return new Session(auth.createSession(user), view(user));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        auth.logout(authorization);
    }

    @GetMapping("/me")
    public UserView me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return view(auth.require(authorization));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason()));
    }

    private static UserView view(AuthService.User user) {
        return new UserView(user.username(), user.nickname());
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
