package com.nara.aivleTK.repository;

import com.nara.aivleTK.domain.board.Board;
import com.nara.aivleTK.domain.board.QBoard;
import com.nara.aivleTK.domain.user.QUser;
import com.nara.aivleTK.dto.board.BoardListRequest;
import com.nara.aivleTK.dto.board.CategoryCountsResponse;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
public class BoardRepositoryCustomImpl implements BoardRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Board> search(BoardListRequest condition, Pageable pageable) {
        QBoard board = QBoard.board;
        QUser user = QUser.user;

        List<OrderSpecifier<?>> orders = getOrderSpecifiers(pageable);

        List<Board> content = queryFactory
                .selectFrom(board)
                .leftJoin(board.user, user).fetchJoin()
                .where(
                        categoryEq(condition.getCategory()),
                        titleOrContentContains(condition.getQ()))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(orders.toArray(OrderSpecifier[]::new))
                .fetch();

        Long total = queryFactory
                .select(board.count())
                .from(board)
                .where(
                        categoryEq(condition.getCategory()),
                        titleOrContentContains(condition.getQ()))
                .fetchOne();

        if (total == null) {
            total = 0L;
        }

        return new PageImpl<>(content, pageable, total);
    }

    @Override
    public CategoryCountsResponse getCategoryCounts() {
        QBoard board = QBoard.board;

        List<com.querydsl.core.Tuple> results = queryFactory
                .select(board.category, board.count())
                .from(board)
                .groupBy(board.category)
                .fetch();

        long all = 0;
        long question = 0;
        long info = 0;
        long review = 0;
        long discussion = 0;

        for (com.querydsl.core.Tuple t : results) {
            String cat = t.get(board.category);
            Long count = t.get(board.count());
            if (count == null)
                count = 0L;

            all += count;
            if ("question".equals(cat) || "1".equals(cat))
                question += count;
            else if ("info".equals(cat) || "2".equals(cat))
                info += count;
            else if ("review".equals(cat) || "3".equals(cat))
                review += count;
            else if ("discussion".equals(cat) || "4".equals(cat))
                discussion += count;
        }

        return CategoryCountsResponse.builder()
                .all(all)
                .question(question)
                .info(info)
                .review(review)
                .discussion(discussion)
                .build();
    }

    private BooleanExpression categoryEq(String category) {
        return StringUtils.hasText(category) ? QBoard.board.category.eq(category) : null;
    }

    private BooleanExpression titleOrContentContains(String q) {
        return StringUtils.hasText(q)
                ? QBoard.board.title.contains(q).or(QBoard.board.content.contains(q))
                : null;
    }

    private List<OrderSpecifier<?>> getOrderSpecifiers(Pageable pageable) {
        List<OrderSpecifier<?>> orders = new ArrayList<>();
        if (!pageable.getSort().isEmpty()) {
            for (Sort.Order order : pageable.getSort()) {
                Order direction = order.getDirection().isAscending() ? Order.ASC : Order.DESC;
                switch (order.getProperty()) {
                    case "viewCount":
                        orders.add(new OrderSpecifier<>(direction, QBoard.board.viewCount));
                        orders.add(new OrderSpecifier<>(Order.DESC, QBoard.board.createdAt));
                        break;
                    case "likeCount":
                        orders.add(new OrderSpecifier<>(direction, QBoard.board.likeCount));
                        orders.add(new OrderSpecifier<>(Order.DESC, QBoard.board.createdAt));
                        break;
                    case "commentCount":
                        orders.add(new OrderSpecifier<>(direction, QBoard.board.commentCount));
                        orders.add(new OrderSpecifier<>(Order.DESC, QBoard.board.createdAt));
                        break;
                    case "createdAt":
                    default:
                        orders.add(new OrderSpecifier<>(direction, QBoard.board.createdAt));
                        break;
                }
            }
        }
        return orders;
    }
}
