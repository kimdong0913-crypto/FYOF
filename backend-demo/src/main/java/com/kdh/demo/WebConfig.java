package com.kdh.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // 서버(VM)에 올릴 때는 app.cors.origins 에 프론트 주소를 추가한다. 예) http://34.64.1.2:8080
    @Value("${app.cors.origins:http://localhost:*,http://127.0.0.1:*}")
    private String[] origins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    }
}
