import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Seat from '../../../src/components/seatmap/Seat';
import type { SeatRenderProps } from '../../../src/components/seatmap/types';

// Mock navigator.vibrate for haptic feedback tests
const mockVibrate = jest.fn();
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: mockVibrate
});

// Mock speechSynthesis for screen reader announcements
const mockSpeak = jest.fn();
const mockCancel = jest.fn();
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: mockSpeak,
    cancel: mockCancel
  }
});

describe('Seat Component', () => {
  const mockSeat = {
    id: 'seat-1',
    row_letter: 'A',
    seat_number: 15,
    status: 'available' as const,
    section_id: 'orchestra',
    section_name: 'Orchestra',
    position: { x: 100, y: 200 },
    price_pence: 7500,
    is_accessible: false,
    notes: null,
    color_hex: '#4ade80'
  };

  const defaultProps: SeatRenderProps = {
    seat: mockSeat,
    position: { x: 100, y: 200 },
    radius: 8,
    isSelected: false,
    isHovered: false,
    showLabel: true,
    showDetails: false,
    onSeatClick: jest.fn(),
    onSeatHover: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders seat with basic properties', () => {
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      const seatElement = screen.getByRole('button');
      expect(seatElement).toBeInTheDocument();
      expect(seatElement).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Seat 15, Row A, Orchestra, available')
      );
    });

    it('renders seat number when showLabel is true', () => {
      render(
        <svg>
          <Seat {...defaultProps} showLabel={true} />
        </svg>
      );

      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('does not render seat number when showLabel is false', () => {
      render(
        <svg>
          <Seat {...defaultProps} showLabel={false} />
        </svg>
      );

      expect(screen.queryByText('15')).not.toBeInTheDocument();
    });

    it('renders accessibility indicator when seat is accessible and showDetails is true', () => {
      const accessibleSeat = { ...mockSeat, is_accessible: true };
      render(
        <svg>
          <Seat {...defaultProps} seat={accessibleSeat} showDetails={true} />
        </svg>
      );

      // Check for accessibility indicator circle
      const seatButton = screen.getByRole('button');
      const circles = seatButton.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(1); // Main circle + accessibility indicator
    });

    it('renders premium indicator for high-priced seats when showDetails is true', () => {
      const premiumSeat = { ...mockSeat, price_pence: 15000 };
      render(
        <svg>
          <Seat {...defaultProps} seat={premiumSeat} showDetails={true} />
        </svg>
      );

      // Check for premium indicator (gold circle)
      const seatGroup = screen.getByRole('button');
      const circles = seatGroup.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes for available seat', () => {
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      const seat = screen.getByRole('button');
      expect(seat).toHaveAttribute('role', 'button');
      expect(seat).toHaveAttribute('tabIndex', '0');
      expect(seat).toHaveAttribute('aria-pressed', 'false');
      expect(seat).toHaveAttribute('aria-disabled', 'false');
      expect(seat).toHaveAttribute(
        'aria-label',
        'Seat 15, Row A, Orchestra, available, £75.00, press Enter or Space to select'
      );
    });

    it('has correct ARIA attributes for selected seat', () => {
      render(
        <svg>
          <Seat {...defaultProps} isSelected={true} />
        </svg>
      );

      const seat = screen.getByRole('button');
      expect(seat).toHaveAttribute('aria-pressed', 'true');
      expect(seat).toHaveAttribute(
        'aria-label',
        expect.stringContaining('currently selected')
      );
    });

    it('has correct ARIA attributes for booked seat', () => {
      const bookedSeat = { ...mockSeat, status: 'booked' as const };
      render(
        <svg>
          <Seat {...defaultProps} seat={bookedSeat} />
        </svg>
      );

      const seat = screen.getByRole('img');
      expect(seat).toHaveAttribute('role', 'img');
      expect(seat).toHaveAttribute('tabIndex', '-1');
      expect(seat).toHaveAttribute('aria-disabled', 'true');
      expect(seat).toHaveAttribute(
        'aria-label',
        expect.stringContaining('booked')
      );
    });

    it('includes accessibility information in aria-description', () => {
      const accessibleSeat = {
        ...mockSeat,
        is_accessible: true,
        notes: 'Extra legroom'
      };
      render(
        <svg>
          <Seat {...defaultProps} seat={accessibleSeat} />
        </svg>
      );

      const seat = screen.getByRole('button');
      expect(seat).toHaveAttribute(
        'aria-description',
        'Extra legroom. This seat has wheelchair accessibility features'
      );
    });

    it('supports keyboard navigation with Enter key', async () => {
      const user = userEvent.setup();
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      const seat = screen.getByRole('button');
      await user.tab(); // Focus the seat
      await user.keyboard('{Enter}');

      expect(defaultProps.onSeatClick).toHaveBeenCalledWith(mockSeat);
      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalled();
    });

    it('supports keyboard navigation with Space key', async () => {
      const user = userEvent.setup();
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      const seat = screen.getByRole('button');
      await user.tab();
      await user.keyboard(' ');

      expect(defaultProps.onSeatClick).toHaveBeenCalledWith(mockSeat);
    });

    it('does not respond to keyboard input for non-available seats', async () => {
      const user = userEvent.setup();
      const bookedSeat = { ...mockSeat, status: 'booked' as const };
      render(
        <svg>
          <Seat {...defaultProps} seat={bookedSeat} />
        </svg>
      );

      const seat = screen.getByRole('img');
      fireEvent.keyDown(seat, { key: 'Enter' });

      expect(defaultProps.onSeatClick).not.toHaveBeenCalled();
    });

    it('announces seat selection to screen readers', async () => {
      const user = userEvent.setup();
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      const seat = screen.getByRole('button');
      await user.tab();
      await user.keyboard('{Enter}');

      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Seat 15 selected'
        })
      );
    });
  });

  describe('Interactions', () => {
    it('calls onSeatClick when clicked', () => {
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onSeatClick).toHaveBeenCalledWith(mockSeat);
    });

    it('triggers haptic feedback on mobile devices', () => {
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('calls onSeatHover on mouse enter for available seats', () => {
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      expect(defaultProps.onSeatHover).toHaveBeenCalledWith(mockSeat);
    });

    it('calls onSeatHover with null on mouse leave', () => {
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      const seat = screen.getByRole('button');
      fireEvent.mouseEnter(seat);
      fireEvent.mouseLeave(seat);
      
      expect(defaultProps.onSeatHover).toHaveBeenLastCalledWith(null);
    });

    it('calls onSeatHover on focus for screen reader users', () => {
      render(
        <svg>
          <Seat {...defaultProps} />
        </svg>
      );

      fireEvent.focus(screen.getByRole('button'));
      expect(defaultProps.onSeatHover).toHaveBeenCalledWith(mockSeat);
    });

    it('does not trigger interactions for non-available seats', () => {
      const bookedSeat = { ...mockSeat, status: 'booked' as const };
      render(
        <svg>
          <Seat {...defaultProps} seat={bookedSeat} />
        </svg>
      );

      fireEvent.click(screen.getByRole('img'));
      expect(defaultProps.onSeatClick).not.toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('applies selected styling when isSelected is true', () => {
      const { container } = render(
        <svg>
          <Seat {...defaultProps} isSelected={true} />
        </svg>
      );

      // Check for selection highlight ring
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(1); // Main circle + selection ring
    });

    it('applies hover styling when isHovered is true', () => {
      const { container } = render(
        <svg>
          <Seat {...defaultProps} isHovered={true} />
        </svg>
      );

      // Check for hover glow effect
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(1); // Main circle + hover glow
    });

    it('shows reduced opacity for booked seats', () => {
      const bookedSeat = { ...mockSeat, status: 'booked' as const };
      const { container } = render(
        <svg>
          <Seat {...defaultProps} seat={bookedSeat} />
        </svg>
      );

      const seatCircle = container.querySelector('circle');
      expect(seatCircle).toHaveAttribute('opacity', '0.5');
    });
  });

  describe('Responsive Sizing', () => {
    it('scales seat size based on radius prop', () => {
      const { container } = render(
        <svg>
          <Seat {...defaultProps} radius={12} />
        </svg>
      );

      const seatCircle = container.querySelector('circle');
      expect(parseFloat(seatCircle?.getAttribute('r') || '0')).toBeGreaterThan(8);
    });

    it('adjusts font size based on radius', () => {
      const { container } = render(
        <svg>
          <Seat {...defaultProps} radius={16} showLabel={true} />
        </svg>
      );

      const text = container.querySelector('text');
      expect(parseFloat(text?.getAttribute('fontSize') || '0')).toBeGreaterThan(4);
    });

    it('shows row letter only when radius is large enough', () => {
      render(
        <svg>
          <Seat {...defaultProps} radius={10} showDetails={true} />
        </svg>
      );

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('hides row letter when radius is too small', () => {
      render(
        <svg>
          <Seat {...defaultProps} radius={6} showDetails={true} />
        </svg>
      );

      expect(screen.queryByText('A')).not.toBeInTheDocument();
    });
  });
}); 