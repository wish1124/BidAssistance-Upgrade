package com.nara.aivleTK.domain.user;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigInteger;

@Entity
@Table(name = "user_search_keyword")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_search_keyword_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @Column(name = "keyword", length = 50, nullable = false)
    private String keyword;

    @Column(name = "min_price")
    private BigInteger minPrice;

    @Column(name = "max_price")
    private BigInteger maxPrice;
}
