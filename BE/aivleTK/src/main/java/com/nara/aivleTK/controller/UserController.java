package com.nara.aivleTK.controller;

import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.dto.ApiResponse;
import com.nara.aivleTK.dto.user.*;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.exception.UnauthorizedException;
import com.nara.aivleTK.repository.UserRepository;
import com.nara.aivleTK.service.UserService;
import com.nara.aivleTK.util.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    // 1. 유저 생성
    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@RequestBody UserCreateRequest user) {
        UserResponse saved = userService.createUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved));
    }

    // 2. 유저 조회
    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable("id") Integer id) {
        UserResponse userResponse = userService.getUserInfo(id);
        return ResponseEntity.ok(ApiResponse.success(userResponse));
    }

    // 3. 로그인 (POST)
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserResponse>> login(@RequestBody LoginRequest request,
            HttpServletResponse response) {
        UserResponse loginUser = userService.login(request);

        String token = jwtUtil.createToken(loginUser.getId(), loginUser.getEmail());

        jwtUtil.addJwtToCookie(token, response);

        return ResponseEntity.ok(ApiResponse.success("로그인 성공", loginUser));
    }

    // 4. 로그아웃 (POST)
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Object>> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(JwtUtil.AUTHORIZATION_HEADER, "")
                .path("/")
                .maxAge(0) // 쿠키 삭제
                .sameSite("None")
                .secure(true)
                .httpOnly(true)
                .build();

        response.addHeader("Set-Cookie", cookie.toString());

        return ResponseEntity.ok(ApiResponse.success("로그아웃 되었습니다."));
    }

    // 5. 회원정보 수정 (PUT)
    @PutMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(@PathVariable Integer id,
            @RequestBody UserCreateRequest request) {
        UserResponse updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("회원정보가 수정되었습니다.", updatedUser));
    }

    // 6. 회원정보 삭제 (DELETE)
    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<Object>> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("회원정보가 삭제되었습니다."));
    }

    // 7. 휴먼 계정 전환
    @PostMapping("/restUser/{id:\\d+}")
    public ResponseEntity<ApiResponse<Object>> restUser(@PathVariable Integer id, @RequestParam Integer rest) { // rest가
        // 전환
        userService.restUser(id, rest);
        return ResponseEntity.ok(ApiResponse.success("계정 상태가 변경되었습니다."));
    }

    // 8. 로그인 확인
    @GetMapping("/checkLogin")
    public ResponseEntity<ApiResponse<UserResponse>> checkLogin(
            @CookieValue(value = JwtUtil.AUTHORIZATION_HEADER, required = false) String tokenValue) {

        if (tokenValue == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }

        String token = jwtUtil.substringToken(tokenValue);

        if (!jwtUtil.validateToken(token)) {
            throw new UnauthorizedException("유효하지 않은 토큰입니다.");
        }

        // 토큰을 db의 유저와 대조 확인
        int userId = jwtUtil.getUserInfoFromToken(token).get("user_id", Integer.class);
        UserResponse userResponse = userService.getUserInfo(userId);

        return ResponseEntity.ok(ApiResponse.success(userResponse));
    }

    // 9. 계정(아이디) 찾기 질문 조회
    @GetMapping("/find-email/identify")
    public ResponseEntity<ApiResponse<QuestionDto>> checkQuestion(@RequestParam String name,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate birth) {
        User user = userRepository.findByNameAndBirth(name, birth)
                .orElseThrow(() -> new ResourceNotFoundException("해당 계정이 없습니다."));

        // question 필드가 숫자 문자열인 경우 Integer로 파싱
        Integer questionIndex = user.getQuestion();
        QuestionDto data = new QuestionDto(user.getId(), questionIndex);
        return ResponseEntity.ok(new ApiResponse<>("success", "확인성공", data));
    }

    // 10. 답변 검증 및 이메일 반환
    @GetMapping("/find-email/verify")
    public ResponseEntity<ApiResponse<String>> verifyEmail(@RequestParam Integer userId, @RequestParam String answer) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("해당 계정이 없습니다."));

        if (!user.getAnswer().equals(answer)) {
            throw new UnauthorizedException("유효하지 않은 답변입니다.");
        }
        return ResponseEntity.ok(ApiResponse.success(user.getEmail()));
    }

    // 11. 비밀번호 질문
    @GetMapping("/recovery_question")
    public ResponseEntity<ApiResponse<QuestionDto>> checkPQuestion(@RequestParam String email,
            @RequestParam String name, @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate birth) {
        User user = userRepository.findByEmailAndNameAndBirth(email, name, birth)
                .orElseThrow(() -> new ResourceNotFoundException("해당 계정이 없습니다."));

        // question 필드가 숫자 문자열인 경우 Integer로 파싱
        Integer questionIndex = user.getQuestion();
        QuestionDto data = new QuestionDto(user.getId(), questionIndex);
        return ResponseEntity.ok(new ApiResponse<>("success", "확인성공", data));
    }

    // 12. 비밀번호 찾기 (POST)
    @PostMapping("/reset_password")
    public ResponseEntity<ApiResponse<Object>> resetPassword(@RequestBody ResetPasswordRequest rpr) {
        userService.resetPassword(rpr.getEmail(), rpr.getName(), rpr.getAnswer(), rpr.getBirth());
        return ResponseEntity.ok(ApiResponse.success("임시 비밀번호가 발급 되었습니다."));
    }
}