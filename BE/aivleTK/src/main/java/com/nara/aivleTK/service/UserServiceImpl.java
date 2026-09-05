package com.nara.aivleTK.service;

import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.dto.user.LoginRequest;
import com.nara.aivleTK.dto.user.UserCreateRequest;
import com.nara.aivleTK.dto.user.UserResponse;
import com.nara.aivleTK.exception.ResourceNotFoundException;
import com.nara.aivleTK.repository.UserRepository;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service // 서비스 빈 등록
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Builder
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final MailService mailService;

    // 유저 생성
    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        // 이메일 중복체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("이미 가입된 이메일입니다.");
        }

        // 비밀번호 유효성 확인
        validatePassword(request.getPassword());
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(encodedPassword)
                .role(0)
                .birth(request.getBirth())

                .question(request.getQuestion())
                .answer(request.getAnswer())
                .build();
        User savedUser = userRepository.save(user); // 2. DB에 저장 필수!

        // 3. 결과 반환 (UserResponse에 생성자가 있다고 가정)
        return UserResponse.builder()
                .id(savedUser.getId())
                .email(savedUser.getEmail())
                .name(savedUser.getName())
                .build();
    }

    // 유저 정보 조회
    public UserResponse getUserInfo(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // UserResponse에 내 정보를 담아서 반환
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .birth(user.getBirth())

                .role(user.getRole())
                .build();
    }

    // 로그인
    @Override
    public UserResponse login(LoginRequest request) {
        // 1. 이메일 검증
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("정보가 일치하는 회원이 없습니다."));

        // 2. 비밀번호 검증
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalStateException("비밀번호가 일치하지 않습니다.");
        }

        // 3. 성공 시 정보 반환
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }

    // 아이디 찾기
    public String findEmail(String name, Integer question, String answer, LocalDate birth) {
        return userRepository.findAllByNameAndQuestionAndBirth(name, question, birth)
                .map(User::getEmail)
                .orElseThrow(() -> new ResourceNotFoundException("해당 정보와 일치하는 회원이 없습니다."));
    }

    // 비밀번호 초기화
    @Transactional
    public String resetPassword(String email, String name, String answer, LocalDate birth) {
        User user = userRepository.findByEmailAndNameAndAnswerAndBirth(email, name, answer, birth)
                .orElseThrow(() -> new ResourceNotFoundException("정보가 일치하는 회원이 없습니다."));

        // 8자리 암호화
        String tempPassword = UUID.randomUUID().toString().substring(0, 8);
        user.setPassword(passwordEncoder.encode(tempPassword));

        // 이메일 발송
        mailService.sendTemporaryPassword(user.getEmail(), tempPassword);

        return "이메일로 임시 비밀번호가 발송되었습니다.";
    }

    // 비밀번호 유효성 검증
    private void validatePassword(String password) {
        String pattern = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$";
        if (!password.matches(pattern)) {
            throw new IllegalArgumentException("비밀번호는 8자 이상, 영문, 숫자, 특수문자 포함해야합니다.");
        }
    }

    // 유저 업데이트
    @Transactional
    public UserResponse updateUser(Integer id, UserCreateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            validatePassword(request.getPassword());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getQuestion() != null) {
            user.setQuestion(request.getQuestion());
        }

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }

    @Transactional
    public void deleteUser(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        userRepository.delete(user);
    }

    @Transactional
    public void restUser(Integer id, Integer rest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setRole(rest);
    }
}
