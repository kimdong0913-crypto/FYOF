package com.kdh.demo;

import java.util.List;
import java.util.Locale;

/**
 * 커뮤니티 글의 욕설을 걸러낸다. 띄어쓰기·숫자·특수문자를 끼워 넣어 피하는 경우("시 1 발")도
 * 잡도록 한글/영문만 남긴 뒤 비교한다.
 */
final class ProfanityFilter {

    private static final List<String> WORDS = List.of(
            "시발", "씨발", "씨빨", "씨바", "ㅅㅂ", "ㅆㅂ", "병신", "븅신", "ㅂㅅ",
            "개새", "개색", "새끼", "ㅅㄲ", "좆", "존나", "졸라", "ㅈㄴ", "지랄", "ㅈㄹ",
            "미친놈", "미친년", "닥쳐", "꺼져", "엠창", "애미", "애비",
            "fuck", "shit", "bitch", "asshole");

    private ProfanityFilter() {}

    static boolean contains(String... texts) {
        for (String text : texts) {
            if (text == null || text.isEmpty()) continue;
            String normalized = text.toLowerCase(Locale.ROOT).replaceAll("[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]", "");
            for (String word : WORDS) {
                if (normalized.contains(word)) return true;
            }
        }
        return false;
    }
}
