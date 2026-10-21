package com.kdh.demo;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * 색조합 글에서 고를 수 있는 색. 자유 색상(hex)은 집계가 안 되므로 정해진 목록에서만 고른다.
 * 프론트의 src/lib/palette.ts 와 id·hex 를 똑같이 맞춰야 한다.
 */
final class StylePalette {

    /** 데님(하의) 색 */
    static final Map<String, String> DENIM = new LinkedHashMap<>();
    /** 상의·신발 색 */
    static final Map<String, String> WEAR = new LinkedHashMap<>();

    static {
        DENIM.put("indigo", "#2F3B7A");
        DENIM.put("mid-blue", "#6E8FC4");
        DENIM.put("light-blue", "#AFC7E3");
        DENIM.put("black-denim", "#2B2B2B");
        DENIM.put("gray-denim", "#8C9097");
        DENIM.put("ecru", "#E6DFCC");

        WEAR.put("white", "#F1F0EC");
        WEAR.put("black", "#2E2E2E");
        WEAR.put("charcoal", "#4A4A4A");
        WEAR.put("gray", "#9A9A9A");
        WEAR.put("beige", "#D8C7A8");
        WEAR.put("brown", "#8A5A34");
        WEAR.put("navy", "#26304F");
        WEAR.put("khaki", "#7A7550");
        WEAR.put("sky", "#B9D3EA");
        WEAR.put("burgundy", "#6E2233");
    }

    static final Set<String> GENDERS = Set.of("", "F", "M");
    static final Set<String> AGES = Set.of("", "10s", "20s", "30s", "40s");

    private StylePalette() {}
}
