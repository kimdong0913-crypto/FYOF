package com.kdh.demo;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 카메라 실시간 AI 피팅 (Decart Lucy VTON). 영상은 브라우저와 Decart 가 WebRTC 로 직접 주고받고,
 * 백엔드는 진짜 API 키를 숨긴 채 짧게 쓰는 토큰만 만들어 준다.
 *   GET  /api/live-tryon        -> { enabled, maxSeconds, left } (키가 없으면 enabled=false)
 *   POST /api/live-tryon/token  (로그인) -> { apiKey, expiresAt, maxSeconds, left }
 * 초 단위로 요금이 나가서, 토큰마다 세션 길이를 Decart 서버가 끊도록 제한하고 하루 횟수도 제한한다.
 * 키는 backend-demo/db.properties(깃에 올리지 않음) 의 decart.api-key 또는 환경변수 DECART_API_KEY 로 넣는다.
 */
@RestController
@RequestMapping("/api/live-tryon")
public class LiveTryOnController {

    private static final Logger log = LoggerFactory.getLogger(LiveTryOnController.class);
    private static final String MODEL = "lucy-vton-latest";

    private final String apiKey;
    private final int maxSeconds;
    private final int dailyLimit;
    private final List<String> origins;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final JsonMapper json = JsonMapper.builder().build();
    private final AuthService auth;
    /** 사용자별 오늘(UTC) 쓴 횟수. 서버를 다시 켜면 초기화된다. */
    private final Map<Long, int[]> usage = new ConcurrentHashMap<>();
    private volatile LocalDate usageDay = LocalDate.now(ZoneOffset.UTC);

    public LiveTryOnController(AuthService auth,
                               @Value("${decart.api-key:${DECART_API_KEY:}}") String apiKey,
                               @Value("${decart.max-seconds:30}") int maxSeconds,
                               @Value("${decart.daily-limit:10}") int dailyLimit,
                               @Value("${decart.origins:http://localhost:8080}") String origins) {
        this.auth = auth;
        this.apiKey = apiKey.strip();
        this.maxSeconds = maxSeconds;
        this.dailyLimit = dailyLimit;
        this.origins = Arrays.stream(origins.split(",")).map(String::strip).filter(s -> !s.isEmpty()).toList();
    }

    @GetMapping
    public Map<String, Object> status(@RequestHeader(value = "Authorization", required = false) String authorization) {
        int left = auth.current(authorization).map(u -> dailyLimit - used(u.id())).orElse(dailyLimit);
        return Map.of("enabled", !apiKey.isEmpty(), "maxSeconds", maxSeconds, "left", Math.max(0, left));
    }

    @PostMapping("/token")
    public Map<String, Object> token(@RequestHeader(value = "Authorization", required = false) String authorization)
            throws java.io.IOException, InterruptedException {
        long user = auth.require(authorization).id();
        if (apiKey.isEmpty()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "실시간 AI 피팅은 아직 준비 중이에요.");
        int[] count = counter(user);
        synchronized (count) {
            if (count[0] >= dailyLimit) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "오늘은 실시간 피팅을 " + dailyLimit + "번 다 썼어요. 내일 다시 해 주세요.");
            count[0]++;
        }
        String body = json.writeValueAsString(Map.of(
                "expiresIn", 60,
                "allowedModels", List.of(MODEL),
                "allowedOrigins", origins,
                "constraints", Map.of("realtime", Map.of("maxSessionDuration", maxSeconds)),
                "metadata", Map.of("fyofUser", user)));
        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create("https://api.decart.ai/v1/client/tokens"))
                        .timeout(Duration.ofSeconds(15))
                        .header("X-API-KEY", apiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body)).build(),
                HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            synchronized (count) { count[0]--; } // 실패한 건 횟수에서 뺀다
            log.warn("Decart 토큰 발급 실패 {}: {}", res.statusCode(), res.body());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "실시간 AI 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.");
        }
        JsonNode token = json.readTree(res.body());
        return Map.of("apiKey", token.path("apiKey").asString(), "expiresAt", token.path("expiresAt").asString(),
                "maxSeconds", maxSeconds, "left", Math.max(0, dailyLimit - count[0]));
    }

    private int used(long user) {
        int[] c = counter(user);
        synchronized (c) { return c[0]; }
    }

    private int[] counter(long user) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (!today.equals(usageDay)) { usage.clear(); usageDay = today; }
        return usage.computeIfAbsent(user, k -> new int[1]);
    }

    @ExceptionHandler(java.io.IOException.class)
    public ResponseEntity<Map<String, String>> networkError(java.io.IOException e) {
        log.warn("Decart 연결 실패: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", "실시간 AI 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> statusError(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했습니다." : e.getReason()));
    }
}
