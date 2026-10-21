package com.kdh.demo;

import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 코디 글에서 고를 수 있는 색과 아이템 형식. 자유 색상(hex)은 집계가 안 되므로 정해진 목록에서만 고른다.
 * 프론트의 src/lib/palette.ts 와 색 id·hex 를 똑같이 맞춰야 한다.
 * 아이템 목록은 프론트(catalog.ts)에 있어서 서버는 아이템 id 형식만 확인한다.
 */
final class StylePalette {

    static final Map<String, String> COLORS = Map.ofEntries(
            Map.entry("white", "#F1F0EC"),
            Map.entry("ivory", "#E9E2D0"),
            Map.entry("beige", "#D8C7A8"),
            Map.entry("camel", "#B98A55"),
            Map.entry("brown", "#8A5A34"),
            Map.entry("khaki", "#7A7550"),
            Map.entry("olive", "#556B2F"),
            Map.entry("black", "#2E2E2E"),
            Map.entry("charcoal", "#4A4A4A"),
            Map.entry("gray", "#9A9A9A"),
            Map.entry("navy", "#26304F"),
            Map.entry("indigo", "#2F3B7A"),
            Map.entry("mid-blue", "#6E8FC4"),
            Map.entry("light-blue", "#AFC7E3"),
            Map.entry("burgundy", "#6E2233"),
            Map.entry("pink", "#E3B5B8"));

    /** 이전 버전 색 id → 지금 색 id (DB 에 남아 있는 값을 바꿀 때 쓴다) */
    static final Map<String, String> LEGACY = Map.of(
            "black-denim", "black",
            "gray-denim", "gray",
            "ecru", "ivory",
            "sky", "light-blue");

    static final Pattern ITEM_ID = Pattern.compile("^[a-z0-9-]{1,40}$");

    static final Set<String> GENDERS = Set.of("", "F", "M");
    static final Set<String> AGES = Set.of("", "10s", "20s", "30s", "40s");

    static boolean isItem(String id) {
        return id != null && ITEM_ID.matcher(id).matches();
    }

    static boolean isColor(String id) {
        return id != null && COLORS.containsKey(id);
    }

    private StylePalette() {}
}
