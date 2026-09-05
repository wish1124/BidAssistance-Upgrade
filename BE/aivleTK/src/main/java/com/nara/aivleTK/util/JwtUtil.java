package com.nara.aivleTK.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import jakarta.servlet.http.HttpServletResponse;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.security.Key;
import java.util.Base64;
import java.util.Date;
import org.springframework.http.ResponseCookie;

@Component
public class JwtUtil {
    public static final String AUTHORIZATION_HEADER = "Authorization";

    public static final String AUTHORIZATION_KEY = "auth";

    public static final String BEARER_PREFIX = "Bearer ";

    private final long TOKEN_TIME = 30 * 60 * 1000L; // 30분 분 초 밀리세컨

    @Value("${jwt.secret.key}")
    private String secretkey;
    private Key key;
    private final SignatureAlgorithm signatureAlgorithm = SignatureAlgorithm.HS256;

    public static final Logger logger = LoggerFactory.getLogger("JWT 관련 로그");

    @PostConstruct
    public void init() {
        byte[] bytes = Base64.getDecoder().decode(secretkey);
        key = Keys.hmacShaKeyFor(bytes);
    }

    // 토큰 만들기
    public String createToken(Integer userId, String email) {
        Date date = new Date();

        return BEARER_PREFIX +
                Jwts.builder()
                        .setSubject(email)
                        .claim("user_id", userId)
                        .setExpiration(new Date(date.getTime() + TOKEN_TIME))
                        .setIssuedAt(date)
                        .signWith(key, signatureAlgorithm)
                        .compact();
    }

    public void addJwtToCookie(String token, HttpServletResponse response) {

        try {
            token = URLEncoder.encode(token, "utf-8").replaceAll("\\+", "%20");

            ResponseCookie cookie = ResponseCookie.from(AUTHORIZATION_HEADER, token)
                    .path("/")
                    .sameSite("None")
                    .secure(true)
                    .httpOnly(true)
                    .maxAge(TOKEN_TIME / 1000)
                    .build();

            response.addHeader("Set-Cookie", cookie.toString());
        } catch (UnsupportedEncodingException e) {
            logger.error(e.getMessage());
        }
    }

    // prefix 토큰 제거
    public String substringToken(String tokenValue) {
        if (StringUtils.hasText(tokenValue) && (tokenValue.startsWith(BEARER_PREFIX))) {
            return tokenValue.substring(7);
        }
        logger.error("Not Found Token");
        throw new NullPointerException("Not Found Token");
    }

    // 토큰 확인
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (SecurityException | MalformedJwtException | SignatureException e) {
            logger.error("Invalid JWT signature, 유효하지 않은 JWT 서명입니다.");
        } catch (ExpiredJwtException e) {
            logger.error("Expired JWT Token, 만료된 JWT token 입니다.");
        } catch (UnsupportedJwtException e) {
            logger.error("Unsupported JWT token, 지원되지 않는 JWT 토큰입니다.");
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims is empty, 잘몬된 JWT 토큰입니다.");
        }
        return false;
    }

    // 토큰으로부터 유저 정보 받아오기
    public Claims getUserInfoFromToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }
}
