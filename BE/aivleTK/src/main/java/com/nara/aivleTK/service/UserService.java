package com.nara.aivleTK.service;

import com.nara.aivleTK.dto.user.LoginRequest;
import com.nara.aivleTK.dto.user.UserCreateRequest;
import com.nara.aivleTK.dto.user.UserResponse;

import java.time.LocalDate;

public interface UserService {
    UserResponse createUser(UserCreateRequest request);

    UserResponse getUserInfo(Integer id);

    UserResponse login(LoginRequest request);

    String findEmail(String name, Integer question, String answer, LocalDate birth);

    String resetPassword(String email, String name, String answer, LocalDate birth);

    UserResponse updateUser(Integer id, UserCreateRequest request);

    void deleteUser(Integer id);

    void restUser(Integer id, Integer rest);
}