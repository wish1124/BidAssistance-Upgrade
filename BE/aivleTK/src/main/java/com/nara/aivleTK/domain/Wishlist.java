package com.nara.aivleTK.domain;

import com.nara.aivleTK.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "wishlist")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Wishlist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wishlist_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bid_id")
    private Bid bid;

    @Column(name = "wishlist_stage")
    private Integer stage;
}