package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.user.User;
import com.nara.aivleTK.domain.user.UserKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserKeywordRepository extends JpaRepository<UserKeyword, Integer> {
    List<UserKeyword> findByUser(User user);
}
