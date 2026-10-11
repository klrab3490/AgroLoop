package com.agroloop.service;

import com.agroloop.dto.SolvencyMetricsDto;
import com.agroloop.model.Admin;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Role;
import com.agroloop.model.TransactionDirection;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminGovernanceService Unit Tests")
class AdminGovernanceServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private HouseholdRepository householdRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    @InjectMocks
    private AdminGovernanceServiceImpl adminGovernanceService;

    private Admin admin1;
    private Admin admin2;
    private Household household;

    @BeforeEach
    void setUp() {
        admin1 = new Admin("Admin One", "admin1@agroloop.com", "hash");
        ReflectionTestUtils.setField(admin1, "id", 1L);

        admin2 = new Admin("Admin Two", "admin2@agroloop.com", "hash");
        ReflectionTestUtils.setField(admin2, "id", 2L);

        household = new Household("Alice", "alice@example.com", "hash", "123 Green Way");
        ReflectionTestUtils.setField(household, "id", 10L);
        household.addTokens(new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("enableUser successfully enables user and persists")
    void enableUser_success() {
        household.disable();
        assertFalse(household.isEnabled());

        when(userRepository.findById(10L)).thenReturn(Optional.of(household));

        adminGovernanceService.enableUser(10L, "admin1@agroloop.com");

        assertTrue(household.isEnabled());
        verify(userRepository).save(household);
    }

    @Test
    @DisplayName("enableUser with non-existent user throws IllegalArgumentException")
    void enableUser_notFound_throwsException() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                adminGovernanceService.enableUser(999L, "admin1@agroloop.com"));
    }

    @Test
    @DisplayName("disableUser prevents administrator self-disable")
    void disableUser_selfDisable_throwsException() {
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                adminGovernanceService.disableUser(1L, "admin1@agroloop.com"));

        assertTrue(ex.getMessage().contains("Administrators cannot disable their own account"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("disableUser blocks disabling the last active administrator")
    void disableUser_lastAdmin_throwsException() {
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));
        when(userRepository.findActiveUsersByRoleForUpdate(Role.ROLE_ADMIN)).thenReturn(List.of(admin2));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin2));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                adminGovernanceService.disableUser(2L, "admin1@agroloop.com"));

        assertTrue(ex.getMessage().contains("Cannot disable the last active administrator"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("disableUser successfully disables an administrator when multiple active admins exist")
    void disableUser_targetAdmin_multipleAdmins_success() {
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));
        when(userRepository.findActiveUsersByRoleForUpdate(Role.ROLE_ADMIN)).thenReturn(List.of(admin1, admin2));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin2));

        adminGovernanceService.disableUser(2L, "admin1@agroloop.com");

        assertFalse(admin2.isEnabled());
        verify(userRepository).save(admin2);
    }

    @Test
    @DisplayName("disableUser successfully disables a household user without admin check constraints")
    void disableUser_householdUser_success() {
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));
        when(userRepository.findActiveUsersByRoleForUpdate(Role.ROLE_ADMIN)).thenReturn(List.of(admin1));
        when(userRepository.findById(10L)).thenReturn(Optional.of(household));

        adminGovernanceService.disableUser(10L, "admin1@agroloop.com");

        assertFalse(household.isEnabled());
        verify(userRepository).save(household);
    }

    @Test
    @DisplayName("disableUser is no-op if user is already disabled")
    void disableUser_alreadyDisabled_noop() {
        household.disable();
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));
        when(userRepository.findActiveUsersByRoleForUpdate(Role.ROLE_ADMIN)).thenReturn(List.of(admin1));
        when(userRepository.findById(10L)).thenReturn(Optional.of(household));

        adminGovernanceService.disableUser(10L, "admin1@agroloop.com");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("adjustTokens CREDIT successfully increases balance and emits ledger entry")
    void adjustTokens_credit_success() {
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));
        when(householdRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(household));

        adminGovernanceService.adjustTokens(10L, new BigDecimal("50.00"), TransactionDirection.CREDIT,
                "Goodwill compensation", "admin1@agroloop.com");

        assertEquals(new BigDecimal("150.00"), household.getTokenBalance());
        verify(householdRepository).save(household);

        ArgumentCaptor<EcoTokenTransaction> txCaptor = ArgumentCaptor.forClass(EcoTokenTransaction.class);
        verify(ecoTokenTransactionRepository).save(txCaptor.capture());
        EcoTokenTransaction tx = txCaptor.getValue();

        assertEquals(new BigDecimal("50.00"), tx.getAmount());
        assertEquals(TransactionDirection.CREDIT, tx.getDirection());
        assertEquals(new BigDecimal("150.00"), tx.getBalanceAfter());
        assertEquals(admin1, tx.getActor());
        assertEquals("Goodwill compensation", tx.getDescription());
    }

    @Test
    @DisplayName("adjustTokens DEBIT successfully decreases balance and emits ledger entry")
    void adjustTokens_debit_success() {
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));
        when(householdRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(household));

        adminGovernanceService.adjustTokens(10L, new BigDecimal("40.00"), TransactionDirection.DEBIT,
                "Manual clawback", "admin1@agroloop.com");

        assertEquals(new BigDecimal("60.00"), household.getTokenBalance());
        verify(householdRepository).save(household);

        ArgumentCaptor<EcoTokenTransaction> txCaptor = ArgumentCaptor.forClass(EcoTokenTransaction.class);
        verify(ecoTokenTransactionRepository).save(txCaptor.capture());
        EcoTokenTransaction tx = txCaptor.getValue();

        assertEquals(new BigDecimal("40.00"), tx.getAmount());
        assertEquals(TransactionDirection.DEBIT, tx.getDirection());
        assertEquals(new BigDecimal("60.00"), tx.getBalanceAfter());
        assertEquals(admin1, tx.getActor());
        assertEquals("Manual clawback", tx.getDescription());
    }

    @Test
    @DisplayName("adjustTokens DEBIT with insufficient balance throws IllegalStateException")
    void adjustTokens_debit_insufficientBalance_throwsException() {
        when(userRepository.findByEmail("admin1@agroloop.com")).thenReturn(Optional.of(admin1));
        when(householdRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(household));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                adminGovernanceService.adjustTokens(10L, new BigDecimal("150.00"), TransactionDirection.DEBIT,
                        "Clawback", "admin1@agroloop.com"));

        assertTrue(ex.getMessage().contains("insufficient token balance"));
        verify(householdRepository, never()).save(any());
        verify(ecoTokenTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("adjustTokens with invalid amount or blank reason throws IllegalArgumentException")
    void adjustTokens_invalidParameters_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
                adminGovernanceService.adjustTokens(10L, BigDecimal.ZERO, TransactionDirection.CREDIT,
                        "Reason", "admin1@agroloop.com"));

        assertThrows(IllegalArgumentException.class, () ->
                adminGovernanceService.adjustTokens(10L, new BigDecimal("-10.00"), TransactionDirection.CREDIT,
                        "Reason", "admin1@agroloop.com"));

        assertThrows(IllegalArgumentException.class, () ->
                adminGovernanceService.adjustTokens(10L, new BigDecimal("10.00"), TransactionDirection.CREDIT,
                        "   ", "admin1@agroloop.com"));
    }

    @Test
    @DisplayName("getPlatformSolvencyMetrics calculates solvency correctly")
    void getPlatformSolvencyMetrics_success() {
        when(ecoTokenTransactionRepository.sumAllHouseholdBalances()).thenReturn(new BigDecimal("100.00"));
        when(ecoTokenTransactionRepository.sumAmountByDirection(TransactionDirection.CREDIT)).thenReturn(new BigDecimal("150.00"));
        when(ecoTokenTransactionRepository.sumAmountByDirection(TransactionDirection.DEBIT)).thenReturn(new BigDecimal("50.00"));

        SolvencyMetricsDto metrics = adminGovernanceService.getPlatformSolvencyMetrics();

        assertEquals(new BigDecimal("100.00"), metrics.getTotalHouseholdBalances());
        assertEquals(new BigDecimal("150.00"), metrics.getTotalCredits());
        assertEquals(new BigDecimal("50.00"), metrics.getTotalDebits());
        assertEquals(new BigDecimal("100.00"), metrics.getExpectedBalance());
        assertEquals(0, metrics.getDiscrepancy().compareTo(BigDecimal.ZERO));
        assertTrue(metrics.isSolvent());
    }

    @Test
    @DisplayName("getAllOrders delegates to repository according to filter")
    void getAllOrders_delegatesToRepository() {
        Order order = new Order(household, "123 Way", null);
        when(orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.PLACED)).thenReturn(List.of(order));
        when(orderRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(order));

        List<Order> filtered = adminGovernanceService.getAllOrders(OrderStatus.PLACED);
        assertEquals(1, filtered.size());

        List<Order> all = adminGovernanceService.getAllOrders(null);
        assertEquals(1, all.size());
    }

    @Test
    @DisplayName("getDisputedOrders filters by DISPUTED status")
    void getDisputedOrders_delegatesToRepository() {
        Order order = new Order(household, "123 Way", null);
        when(orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.DISPUTED)).thenReturn(List.of(order));

        List<Order> disputed = adminGovernanceService.getDisputedOrders();
        assertEquals(1, disputed.size());
    }

    @Test
    @DisplayName("getPlatformLedger paginates platform ledger transactions")
    void getPlatformLedger_success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<EcoTokenTransaction> page = new PageImpl<>(List.of());
        when(ecoTokenTransactionRepository.findAllPlatformTransactions(pageable)).thenReturn(page);

        Page<EcoTokenTransaction> result = adminGovernanceService.getPlatformLedger(pageable);
        assertNotNull(result);
        verify(ecoTokenTransactionRepository).findAllPlatformTransactions(pageable);
    }
}
