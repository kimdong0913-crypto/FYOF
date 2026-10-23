package com.kdh.demo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * AI 가상 피팅. CPU 추론은 몇 분 걸릴 수 있어서 작업(job) 방식으로 처리한다.
 *   POST /api/tryon            -> { jobId }
 *   GET  /api/tryon/{id}       -> { status: PENDING|DONE|FAILED, error? }
 *   GET  /api/tryon/{id}/image -> image/png
 */
@RestController
@RequestMapping("/api/tryon")
public class TryOnController {

    private static final String CRLF = "\r\n";

    private enum Status { PENDING, DONE, FAILED }

    private static class Job {
        volatile Status status = Status.PENDING;
        volatile byte[] image;
        volatile String error;
    }

    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    // 모델이 한 번에 하나만 처리하므로 작업도 순서대로 하나씩 보낸다.
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final HttpClient http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
    private final String aiUrl;

    public TryOnController(@org.springframework.beans.factory.annotation.Value("${ai.url:http://localhost:8000}") String aiUrl) {
        this.aiUrl = aiUrl;
    }

    @PostMapping
    public Map<String, String> create(
            @RequestParam("person") MultipartFile person,
            @RequestParam("garment") MultipartFile garment,
            @RequestParam(defaultValue = "bottoms") String category,
            @RequestParam(defaultValue = "model") String garmentPhotoType) throws java.io.IOException {
        if (person.isEmpty() || garment.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지가 비어 있습니다.");
        }
        byte[] personBytes = person.getBytes();
        byte[] garmentBytes = garment.getBytes();

        String id = UUID.randomUUID().toString();
        Job job = new Job();
        jobs.put(id, job);

        worker.submit(() -> {
            try {
                job.image = callAi(personBytes, garmentBytes, category, garmentPhotoType);
                job.status = Status.DONE;
            } catch (java.net.ConnectException e) {
                job.error = "AI 서버가 꺼져 있어요. AI 합성은 AI 서버를 켠 뒤(서버 배포 후)에 쓸 수 있어요.";
                job.status = Status.FAILED;
            } catch (Exception e) {
                // 연결 거부가 다른 예외에 감싸져 오는 경우도 있다
                Throwable root = e; while (root.getCause() != null) root = root.getCause();
                job.error = root instanceof java.net.ConnectException ? "AI 서버가 꺼져 있어요. AI 합성은 AI 서버를 켠 뒤(서버 배포 후)에 쓸 수 있어요."
                        : e.getMessage() == null ? "AI 합성에 실패했어요." : e.getMessage();
                job.status = Status.FAILED;
            }
        });
        return Map.of("jobId", id);
    }

    @GetMapping("/{id}")
    public Map<String, String> status(@PathVariable String id) {
        Job job = find(id);
        return job.error == null
                ? Map.of("status", job.status.name())
                : Map.of("status", job.status.name(), "error", job.error);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> image(@PathVariable String id) {
        Job job = find(id);
        if (job.status != Status.DONE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "아직 완료되지 않았습니다.");
        }
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(job.image);
    }

    private Job find(String id) {
        Job job = jobs.get(id);
        if (job == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다.");
        return job;
    }

    /** multipart/form-data 본문을 직접 만들어 Python AI 서버(/tryon)로 보낸다. */
    private byte[] callAi(byte[] person, byte[] garment, String category, String garmentPhotoType) throws Exception {
        String boundary = "----tryon" + UUID.randomUUID();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        filePart(out, boundary, "person", "person.png", person);
        filePart(out, boundary, "garment", "garment.png", garment);
        textPart(out, boundary, "category", category);
        textPart(out, boundary, "garment_photo_type", garmentPhotoType);
        out.write(("--" + boundary + "--" + CRLF).getBytes(StandardCharsets.UTF_8));

        HttpRequest req = HttpRequest.newBuilder(URI.create(aiUrl + "/tryon"))
                .timeout(Duration.ofMinutes(30))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray()))
                .build();
        HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
        if (res.statusCode() != 200) {
            throw new IllegalStateException("AI 서버 오류 " + res.statusCode() + ": " + new String(res.body(), StandardCharsets.UTF_8));
        }
        return res.body();
    }

    private static void filePart(ByteArrayOutputStream out, String boundary, String name, String filename, byte[] data) throws IOException {
        out.write(("--" + boundary + CRLF
                + "Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename + "\"" + CRLF
                + "Content-Type: application/octet-stream" + CRLF + CRLF).getBytes(StandardCharsets.UTF_8));
        out.write(data);
        out.write(CRLF.getBytes(StandardCharsets.UTF_8));
    }

    private static void textPart(ByteArrayOutputStream out, String boundary, String name, String value) throws IOException {
        out.write(("--" + boundary + CRLF
                + "Content-Disposition: form-data; name=\"" + name + "\"" + CRLF + CRLF
                + value + CRLF).getBytes(StandardCharsets.UTF_8));
    }
}
