package com.nara.aivleTK.domain.Attachment;

import com.nara.aivleTK.domain.AnalysisResult;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.domain.board.Board;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    private String fileName;
    private String storeName;

    @Column(length = 1000)
    private String url;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id")
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bid_id")
    private Bid bid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysisResultId")
    private AnalysisResult analysisResult;

    public Attachment(String fileName, String storeName, String url) {
        this.fileName = fileName;
        this.storeName = storeName;
        this.url = url;
    }
}
