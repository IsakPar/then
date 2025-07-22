// Accessibility utilities for mobile seatmap
// Ensures WCAG 2.1 AA compliance for theater seat selection

export interface AccessibilityOptions {
  enableHighContrast?: boolean;
  enableReducedMotion?: boolean;
  enableLargeText?: boolean;
  enableScreenReader?: boolean;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private options: AccessibilityOptions = {};
  
  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  // Initialize accessibility features
  init(): void {
    this.detectUserPreferences();
    this.setupKeyboardNavigation();
    this.setupScreenReaderSupport();
  }

  // Detect user accessibility preferences
  private detectUserPreferences(): void {
    if (typeof window === 'undefined') return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.options.enableReducedMotion = prefersReducedMotion;

    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    this.options.enableHighContrast = prefersHighContrast;

    // Check for large text preference
    const prefersLargeText = window.matchMedia('(prefers-reduced-data: no-preference)').matches;
    this.options.enableLargeText = prefersLargeText;

    // Apply preferences
    this.applyPreferences();
  }

  // Apply user preferences to DOM
  private applyPreferences(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    if (this.options.enableHighContrast) {
      root.style.setProperty('--seat-available-color', '#000000');
      root.style.setProperty('--seat-selected-color', '#ffffff');
      root.style.setProperty('--seat-unavailable-color', '#666666');
    }

    if (this.options.enableReducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms');
    }

    if (this.options.enableLargeText) {
      root.style.setProperty('--base-font-size', '18px');
      root.style.setProperty('--seat-font-size', '14px');
    }
  }

  // Setup keyboard navigation for accessibility
  private setupKeyboardNavigation(): void {
    if (typeof window === 'undefined') return;

    let currentSeatIndex = 0;
    const availableSeats: HTMLElement[] = [];

    const updateAvailableSeats = () => {
      availableSeats.length = 0;
      const seats = document.querySelectorAll('[data-seat-id][data-seat-available="true"]');
      seats.forEach(seat => {
        if (seat instanceof HTMLElement) {
          availableSeats.push(seat);
        }
      });
    };

    const focusSeat = (index: number) => {
      if (availableSeats[index]) {
        availableSeats[index].focus();
        availableSeats[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
      updateAvailableSeats();
      
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          currentSeatIndex = Math.min(currentSeatIndex + 1, availableSeats.length - 1);
          focusSeat(currentSeatIndex);
          break;
          
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          currentSeatIndex = Math.max(currentSeatIndex - 1, 0);
          focusSeat(currentSeatIndex);
          break;
          
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (availableSeats[currentSeatIndex]) {
            availableSeats[currentSeatIndex].click();
          }
          break;
          
        case 'Home':
          e.preventDefault();
          currentSeatIndex = 0;
          focusSeat(currentSeatIndex);
          break;
          
        case 'End':
          e.preventDefault();
          currentSeatIndex = availableSeats.length - 1;
          focusSeat(currentSeatIndex);
          break;
      }
    });
  }

  // Setup screen reader support
  private setupScreenReaderSupport(): void {
    if (typeof document === 'undefined') return;

    // Add live region for seat selection announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'seat-selection-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  }

  // Announce seat selection to screen readers
  announceSeatSelection(seatInfo: { row: string; seat: number; section: string; action: 'selected' | 'deselected' }): void {
    if (typeof document === 'undefined') return;

    const liveRegion = document.getElementById('seat-selection-live-region');
    if (liveRegion) {
      const message = `Seat ${seatInfo.row}${seatInfo.seat} in ${seatInfo.section} ${seatInfo.action}`;
      liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  // Generate ARIA label for seat
  generateSeatAriaLabel(seat: {
    row: string;
    seat: number;
    section: string;
    price: number;
    status: 'available' | 'selected' | 'unavailable';
  }): string {
    const baseLabel = `Seat ${seat.row}${seat.seat} in ${seat.section}`;
    const priceLabel = `£${(seat.price / 100).toFixed(2)}`;
    
    switch (seat.status) {
      case 'available':
        return `${baseLabel}, ${priceLabel}, available for selection`;
      case 'selected':
        return `${baseLabel}, ${priceLabel}, selected`;
      case 'unavailable':
        return `${baseLabel}, unavailable`;
      default:
        return baseLabel;
    }
  }

  // Generate ARIA description for section
  generateSectionAriaDescription(section: {
    name: string;
    available: number;
    total: number;
    priceRange: { min: number; max: number };
  }): string {
    const availability = `${section.available} of ${section.total} seats available`;
    const priceRange = `£${(section.priceRange.min / 100).toFixed(2)} to £${(section.priceRange.max / 100).toFixed(2)}`;
    
    return `${section.name} section: ${availability}, price range ${priceRange}`;
  }

  // Handle focus management for mobile drawer
  manageFocusForDrawer(isOpen: boolean): void {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      // Focus first interactive element in drawer
      const drawer = document.querySelector('[data-drawer="true"]');
      if (drawer) {
        const focusableElements = drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    } else {
      // Return focus to trigger element (usually the seatmap)
      const seatmap = document.querySelector('[data-seatmap="true"]');
      if (seatmap) {
        (seatmap as HTMLElement).focus();
      }
    }
  }

  // Validate touch target sizes (minimum 44px)
  validateTouchTargets(): boolean {
    if (typeof document === 'undefined') return true;

    const interactiveElements = document.querySelectorAll('button, [role="button"], a, input');
    let isValid = true;

    interactiveElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          console.warn('Touch target too small:', element, `${rect.width}x${rect.height}`);
          isValid = false;
        }
      }
    });

    return isValid;
  }

  // Get accessibility status
  getAccessibilityStatus(): {
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    touchTargetsValid: boolean;
  } {
    return {
      highContrast: this.options.enableHighContrast || false,
      reducedMotion: this.options.enableReducedMotion || false,
      largeText: this.options.enableLargeText || false,
      touchTargetsValid: this.validateTouchTargets()
    };
  }
}

export const accessibilityManager = AccessibilityManager.getInstance(); 