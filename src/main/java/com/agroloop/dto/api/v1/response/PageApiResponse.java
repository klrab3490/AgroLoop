package com.agroloop.dto.api.v1.response;

import org.springframework.data.domain.Page;
import java.util.List;
import java.util.function.Function;

public record PageApiResponse<T>(
    List<T> content,
    int pageNumber,
    int pageSize,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last
) {
    public static <E, T> PageApiResponse<T> from(Page<E> page, Function<E, T> mapper) {
        List<T> mappedContent = page.getContent().stream().map(mapper).toList();
        return new PageApiResponse<>(
            mappedContent,
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isFirst(),
            page.isLast()
        );
    }

    public static <T> PageApiResponse<T> of(List<T> content, int pageNumber, int pageSize, long totalElements) {
        int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalElements / pageSize) : 0;
        return new PageApiResponse<>(
            content,
            pageNumber,
            pageSize,
            totalElements,
            totalPages,
            pageNumber == 0,
            pageNumber >= totalPages - 1
        );
    }
}
