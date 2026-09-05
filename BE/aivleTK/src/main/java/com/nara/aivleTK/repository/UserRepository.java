package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmail(String email); // 로그인

    boolean existsByEmail(String email);

    Optional<User> findAllByNameAndQuestionAndBirth(String name, Integer question, LocalDate birth);

    Optional<User> findByEmailAndNameAndAnswerAndBirth(String email, String name, String answer, LocalDate birth);

    Optional<User> findByEmailAndNameAndBirth(String email, String name, LocalDate birth);

    Optional<User> findByNameAndBirth(String name, LocalDate birth);
}
