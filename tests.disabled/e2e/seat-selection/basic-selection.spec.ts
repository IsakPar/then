import { test, expect } from '@playwright/test';

// ============================================================================
// BASIC SEAT SELECTION E2E TESTS
// ============================================================================

const TEST_SHOW_ID = '81447867-94ac-47b1-96cf-d70d3d5ad02e'; // Hamilton show for testing
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Basic Seat Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to seat selection page
    await page.goto(`${BASE_URL}/show/${TEST_SHOW_ID}/seats`);
    
    // Wait for seat map to load
    await page.waitForSelector('[data-testid="seat-map-container"]', { timeout: 10000 });
    
    // Wait for seats to be rendered
    await page.waitForSelector('[data-testid="seat"]', { timeout: 10000 });
  });

  test('should load seat map with available seats', async ({ page }) => {
    // Verify seat map container is visible
    const seatMapContainer = page.locator('[data-testid="seat-map-container"]');
    await expect(seatMapContainer).toBeVisible();

    // Verify seats are rendered
    const seats = page.locator('[data-testid="seat"]');
    await expect(seats).toHaveCountGreaterThan(0);

    // Check that available seats are interactive
    const availableSeats = page.locator('[data-testid="seat"][data-status="available"]');
    await expect(availableSeats).toHaveCountGreaterThan(0);

    // Verify stage indicator is present
    const stageIndicator = page.locator('[data-testid="stage-indicator"]');
    await expect(stageIndicator).toBeVisible();
  });

  test('should select a seat when clicked', async ({ page }) => {
    // Find and click an available seat
    const availableSeat = page.locator('[data-testid="seat"][data-status="available"]').first();
    await availableSeat.click();

    // Verify seat becomes selected
    await expect(availableSeat).toHaveAttribute('data-status', 'selected');
    
    // Verify seat has selected styling
    await expect(availableSeat).toHaveClass(/selected/);

    // Check that selection count updates
    const selectionInfo = page.locator('[data-testid="seat-selection-info"]');
    await expect(selectionInfo).toContainText('1 seat selected');
  });

  test('should deselect a seat when clicked twice', async ({ page }) => {
    // Find an available seat
    const availableSeat = page.locator('[data-testid="seat"][data-status="available"]').first();
    
    // Select the seat
    await availableSeat.click();
    await expect(availableSeat).toHaveAttribute('data-status', 'selected');

    // Deselect the seat
    await availableSeat.click();
    await expect(availableSeat).toHaveAttribute('data-status', 'available');

    // Verify selection count is back to 0
    const selectionInfo = page.locator('[data-testid="seat-selection-info"]');
    await expect(selectionInfo).toContainText('0 seats selected');
  });

  test('should select multiple seats', async ({ page }) => {
    // Select multiple seats
    const availableSeats = page.locator('[data-testid="seat"][data-status="available"]');
    
    for (let i = 0; i < 3; i++) {
      await availableSeats.nth(i).click();
      await expect(availableSeats.nth(i)).toHaveAttribute('data-status', 'selected');
    }

    // Verify selection count
    const selectionInfo = page.locator('[data-testid="seat-selection-info"]');
    await expect(selectionInfo).toContainText('3 seats selected');

    // Verify all selected seats are highlighted
    const selectedSeats = page.locator('[data-testid="seat"][data-status="selected"]');
    await expect(selectedSeats).toHaveCount(3);
  });

  test('should display seat details on hover', async ({ page }) => {
    // Hover over a seat
    const availableSeat = page.locator('[data-testid="seat"][data-status="available"]').first();
    await availableSeat.hover();

    // Check if tooltip appears with seat details
    const tooltip = page.locator('[data-testid="seat-tooltip"]');
    await expect(tooltip).toBeVisible();
    
    // Verify tooltip contains seat information
    await expect(tooltip).toContainText(/Row/);
    await expect(tooltip).toContainText(/Seat/);
    await expect(tooltip).toContainText(/£/); // Price information
  });

  test('should prevent selection of booked seats', async ({ page }) => {
    // Find a booked seat if available
    const bookedSeat = page.locator('[data-testid="seat"][data-status="booked"]').first();
    
    if (await bookedSeat.count() > 0) {
      // Try to click booked seat
      await bookedSeat.click();
      
      // Verify it remains booked (not selected)
      await expect(bookedSeat).toHaveAttribute('data-status', 'booked');
      
      // Verify no selection count change
      const selectionInfo = page.locator('[data-testid="seat-selection-info"]');
      await expect(selectionInfo).toContainText('0 seats selected');
    }
  });

  test('should show price information for selected seats', async ({ page }) => {
    // Select a seat
    const availableSeat = page.locator('[data-testid="seat"][data-status="available"]').first();
    await availableSeat.click();

    // Check that price information is displayed
    const priceInfo = page.locator('[data-testid="price-summary"]');
    await expect(priceInfo).toBeVisible();
    await expect(priceInfo).toContainText(/£/);
    await expect(priceInfo).toContainText(/Total/);
  });

  test('should enable checkout button when seats are selected', async ({ page }) => {
    // Initially checkout should be disabled
    const checkoutButton = page.locator('[data-testid="checkout-button"]');
    await expect(checkoutButton).toBeDisabled();

    // Select a seat
    const availableSeat = page.locator('[data-testid="seat"][data-status="available"]').first();
    await availableSeat.click();

    // Checkout should now be enabled
    await expect(checkoutButton).toBeEnabled();
    await expect(checkoutButton).toContainText(/Continue to Checkout/);
  });
});

test.describe('Seat Map Zoom and Pan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/show/${TEST_SHOW_ID}/seats`);
    await page.waitForSelector('[data-testid="seat-map-container"]', { timeout: 10000 });
  });

  test('should zoom in on seat map', async ({ page }) => {
    const seatMap = page.locator('[data-testid="seat-map-svg"]');
    
    // Get initial transform
    const initialTransform = await seatMap.getAttribute('style');
    
    // Zoom in using zoom controls
    const zoomInButton = page.locator('[data-testid="zoom-in-button"]');
    await zoomInButton.click();
    
    // Verify transform changed (zoomed in)
    const newTransform = await seatMap.getAttribute('style');
    expect(newTransform).not.toBe(initialTransform);
    
    // Verify zoom level indicator
    const zoomLevel = page.locator('[data-testid="zoom-level"]');
    await expect(zoomLevel).toContainText(/\d+%/);
  });

  test('should zoom out on seat map', async ({ page }) => {
    // First zoom in
    const zoomInButton = page.locator('[data-testid="zoom-in-button"]');
    await zoomInButton.click();
    
    const seatMap = page.locator('[data-testid="seat-map-svg"]');
    const zoomedTransform = await seatMap.getAttribute('style');
    
    // Then zoom out
    const zoomOutButton = page.locator('[data-testid="zoom-out-button"]');
    await zoomOutButton.click();
    
    // Verify transform changed (zoomed out)
    const finalTransform = await seatMap.getAttribute('style');
    expect(finalTransform).not.toBe(zoomedTransform);
  });

  test('should reset zoom to fit', async ({ page }) => {
    // Zoom in first
    const zoomInButton = page.locator('[data-testid="zoom-in-button"]');
    await zoomInButton.click();
    await zoomInButton.click();
    
    // Reset to fit
    const fitToViewButton = page.locator('[data-testid="fit-to-view-button"]');
    await fitToViewButton.click();
    
    // Verify zoom reset
    const zoomLevel = page.locator('[data-testid="zoom-level"]');
    await expect(zoomLevel).toContainText('100%');
  });
});

test.describe('Section-based Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/show/${TEST_SHOW_ID}/seats`);
    await page.waitForSelector('[data-testid="seat-map-container"]', { timeout: 10000 });
  });

  test('should display section information', async ({ page }) => {
    // Check for section labels
    const sectionLabels = page.locator('[data-testid="section-label"]');
    await expect(sectionLabels).toHaveCountGreaterThan(0);
    
    // Verify section labels have text
    const firstSectionLabel = sectionLabels.first();
    await expect(firstSectionLabel).not.toBeEmpty();
  });

  test('should filter seats by section', async ({ page }) => {
    // Check if section filter exists
    const sectionFilter = page.locator('[data-testid="section-filter"]');
    
    if (await sectionFilter.count() > 0) {
      // Select a specific section
      await sectionFilter.selectOption({ index: 1 });
      
      // Verify only seats from that section are highlighted/visible
      const highlightedSeats = page.locator('[data-testid="seat"].highlighted');
      await expect(highlightedSeats).toHaveCountGreaterThan(0);
    }
  });

  test('should show section pricing information', async ({ page }) => {
    // Check for section pricing display
    const sectionPricing = page.locator('[data-testid="section-pricing"]');
    
    if (await sectionPricing.count() > 0) {
      await expect(sectionPricing).toBeVisible();
      await expect(sectionPricing).toContainText(/£/);
    }
  });
});

test.describe('Accessibility Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/show/${TEST_SHOW_ID}/seats`);
    await page.waitForSelector('[data-testid="seat-map-container"]', { timeout: 10000 });
  });

  test('should navigate seats with keyboard', async ({ page }) => {
    // Focus on first seat
    await page.keyboard.press('Tab');
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    
    // Select with Enter/Space
    await page.keyboard.press('Enter');
    
    // Verify a seat was selected
    const selectedSeats = page.locator('[data-testid="seat"][data-status="selected"]');
    await expect(selectedSeats).toHaveCountGreaterThan(0);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Check for aria-label on seats
    const seats = page.locator('[data-testid="seat"]');
    const firstSeat = seats.first();
    
    const ariaLabel = await firstSeat.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('Row');
    expect(ariaLabel).toContain('Seat');
  });

  test('should announce selection changes to screen readers', async ({ page }) => {
    // Check for aria-live region
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
    
    // Select a seat and check announcement
    const availableSeat = page.locator('[data-testid="seat"][data-status="available"]').first();
    await availableSeat.click();
    
    // The live region should update with selection info
    await expect(liveRegion).toContainText(/selected/);
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate network error
    await page.route('**/api/shows/*/seats', route => route.abort());
    
    await page.goto(`${BASE_URL}/show/${TEST_SHOW_ID}/seats`);
    
    // Check for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/unable to load/i);
  });

  test('should show loading state', async ({ page }) => {
    // Delay the API response
    await page.route('**/api/shows/*/seats', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.goto(`${BASE_URL}/show/${TEST_SHOW_ID}/seats`);
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    await expect(loadingIndicator).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="seat-map-container"]', { timeout: 15000 });
    await expect(loadingIndicator).not.toBeVisible();
  });
}); 