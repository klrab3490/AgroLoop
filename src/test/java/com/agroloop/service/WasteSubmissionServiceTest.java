package com.agroloop.service;

import com.agroloop.dto.WasteSubmissionRequest;
import com.agroloop.model.Household;
import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import com.agroloop.service.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WasteSubmissionService Unit Tests (Phase 3 - Step 4)")
class WasteSubmissionServiceTest {

    @Mock
    private HouseholdRepository householdRepository;

    @Mock
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Mock
    private com.agroloop.repository.PickupRequestRepository pickupRequestRepository;

    @Mock
    private FileStorageService fileStorageService;

    private WasteSubmissionServiceImpl wasteSubmissionService;

    private Household testHousehold;

    @BeforeEach
    void setUp() {
        wasteSubmissionService = new WasteSubmissionServiceImpl(
                householdRepository,
                wasteSubmissionRepository,
                pickupRequestRepository,
                fileStorageService
        );

        testHousehold = new Household("Alice Green", "alice@agroloop.com", "hash", "100 Pine Street, Kochi");
    }

    @Test
    @DisplayName("submitWaste delegates photo storage and creates WasteSubmission with registered address fallback")
    void testSubmitWasteWithRegisteredAddressFallback() {
        when(householdRepository.findByEmail("alice@agroloop.com")).thenReturn(Optional.of(testHousehold));
        when(fileStorageService.storeFile(any(), eq("waste"))).thenReturn("waste/uuid-123.jpg");
        when(wasteSubmissionRepository.save(any(WasteSubmission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockMultipartFile photo = new MockMultipartFile("photo", "waste.jpg", "image/jpeg", "image bytes".getBytes());
        WasteSubmissionRequest request = new WasteSubmissionRequest(
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("5.50"),
                null, // No custom address
                "Kitchen scraps",
                photo
        );

        WasteSubmission result = wasteSubmissionService.submitWaste("alice@agroloop.com", request);

        assertNotNull(result);
        assertEquals(testHousehold, result.getHousehold());
        assertEquals(WasteCategory.FOOD_SCRAPS, result.getCategory());
        assertEquals(new BigDecimal("5.50"), result.getEstimatedWeight());
        assertEquals("100 Pine Street, Kochi", result.getPickupAddress(), "Should fall back to household address");
        assertEquals("waste/uuid-123.jpg", result.getImagePath());
        assertEquals("Kitchen scraps", result.getNotes());
        assertEquals(SubmissionStatus.SUBMITTED, result.getStatus());

        verify(fileStorageService).storeFile(photo, "waste");
        verify(wasteSubmissionRepository).save(any(WasteSubmission.class));
    }

    @Test
    @DisplayName("submitWaste uses custom pickup address when provided")
    void testSubmitWasteWithCustomAddress() {
        when(householdRepository.findByEmail("alice@agroloop.com")).thenReturn(Optional.of(testHousehold));
        when(fileStorageService.storeFile(null, "waste")).thenReturn(null);
        when(wasteSubmissionRepository.save(any(WasteSubmission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WasteSubmissionRequest request = new WasteSubmissionRequest(
                WasteCategory.GARDEN_WASTE,
                new BigDecimal("20.00"),
                "200 Alternate Lane, Kochi",
                null,
                null // No photo
        );

        WasteSubmission result = wasteSubmissionService.submitWaste("alice@agroloop.com", request);

        assertEquals("200 Alternate Lane, Kochi", result.getPickupAddress());
        assertNull(result.getImagePath());
    }

    @Test
    @DisplayName("submitWaste throws IllegalArgumentException when household not found")
    void testSubmitWasteHouseholdNotFound() {
        when(householdRepository.findByEmail("unknown@agroloop.com")).thenReturn(Optional.empty());

        WasteSubmissionRequest request = new WasteSubmissionRequest(
                WasteCategory.COFFEE_GROUNDS,
                new BigDecimal("1.00"),
                null,
                null,
                null
        );

        assertThrows(IllegalArgumentException.class, () ->
                wasteSubmissionService.submitWaste("unknown@agroloop.com", request));
        verifyNoInteractions(wasteSubmissionRepository);
    }

    @Test
    @DisplayName("getSubmissionsByHousehold retrieves descending list for valid user")
    void testGetSubmissionsByHousehold() {
        when(householdRepository.findByEmail("alice@agroloop.com")).thenReturn(Optional.of(testHousehold));
        WasteSubmission sub = testHousehold.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("4.00"), null, null, null);
        when(wasteSubmissionRepository.findByHouseholdIdOrderByCreatedAtDesc(testHousehold.getId()))
                .thenReturn(List.of(sub));

        List<WasteSubmission> list = wasteSubmissionService.getSubmissionsByHousehold("alice@agroloop.com");
        assertEquals(1, list.size());
        assertEquals(sub, list.get(0));
    }

    @Test
    @DisplayName("getAvailableSubmissions queries only SUBMITTED items")
    void testGetAvailableSubmissions() {
        WasteSubmission sub = testHousehold.submitWaste(WasteCategory.AGRICULTURAL_ORGANIC, new BigDecimal("50.00"), null, null, null);
        when(wasteSubmissionRepository.findByStatusOrderByCreatedAtDesc(SubmissionStatus.SUBMITTED))
                .thenReturn(List.of(sub));

        List<WasteSubmission> list = wasteSubmissionService.getAvailableSubmissions();
        assertEquals(1, list.size());
        assertEquals(SubmissionStatus.SUBMITTED, list.get(0).getStatus());
    }

    @Test
    @DisplayName("getSubmissionById returns submission or throws exception when not found")
    void testGetSubmissionById() {
        WasteSubmission sub = testHousehold.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("2.00"), null, null, null);
        when(wasteSubmissionRepository.findById(1L)).thenReturn(Optional.of(sub));
        when(wasteSubmissionRepository.findById(99L)).thenReturn(Optional.empty());

        assertEquals(sub, wasteSubmissionService.getSubmissionById(1L));
        assertThrows(IllegalArgumentException.class, () -> wasteSubmissionService.getSubmissionById(99L));
    }
}
