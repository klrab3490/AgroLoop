package com.agroloop.service.matching;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Registry and resolver for polymorphic WasteMatcher strategies.
 */
@Service
public class WasteMatcherRegistry {

    private final Map<String, WasteMatcher> matchers;
    private final WasteMatcher defaultMatcher;

    public WasteMatcherRegistry(List<WasteMatcher> matcherList, CompositeWasteMatcher defaultMatcher) {
        this.matchers = matcherList.stream()
                .collect(Collectors.toMap(m -> m.getStrategyName().toUpperCase(), m -> m));
        this.defaultMatcher = defaultMatcher;
    }

    public WasteMatcher getMatcher(String strategyName) {
        if (strategyName == null || strategyName.isBlank()) {
            return defaultMatcher;
        }
        WasteMatcher matcher = matchers.get(strategyName.trim().toUpperCase());
        return matcher != null ? matcher : defaultMatcher;
    }

    public List<String> getAvailableStrategies() {
        return List.copyOf(matchers.keySet());
    }
}
