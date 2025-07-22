//
//  HardcodedSeatMapView.swift
//  Last Minute Live
//
//  Hardcoded seat map implementation using WebKit to display SVG seat map
//

import SwiftUI
import WebKit

struct HardcodedSeatMapView: View {
    @Binding var selectedSeats: Set<String>
    let onSeatTapped: (String) -> Void
    let containerSize: CGSize
    
    var body: some View {
        HardcodedSeatMapWebView(
            selectedSeats: selectedSeats,
            onSeatTapped: onSeatTapped,
            containerSize: containerSize
        )
    }
}

struct HardcodedSeatMapWebView: UIViewRepresentable {
    let selectedSeats: Set<String>
    let onSeatTapped: (String) -> Void
    let containerSize: CGSize
    
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(context.coordinator, name: "seatTapped")
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = true
        webView.scrollView.bouncesZoom = true
        webView.scrollView.minimumZoomScale = 0.5
        webView.scrollView.maximumZoomScale = 3.0
        
        // Load the hardcoded seat map HTML
        let htmlContent = generateSeatMapHTML()
        webView.loadHTMLString(htmlContent, baseURL: nil)
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        // Update selected seats
        let selectedSeatsJSON = try? JSONSerialization.data(withJSONObject: Array(selectedSeats))
        if let jsonData = selectedSeatsJSON,
           let jsonString = String(data: jsonData, encoding: .utf8) {
            let script = "updateSelectedSeats(\(jsonString))"
            webView.evaluateJavaScript(script)
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    private func generateSeatMapHTML() -> String {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    background-color: #1a1a1a;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    overflow-x: auto;
                }
                
                #seat-map-container {
                    background-color: #1a1a1a;
                    border-radius: 12px;
                    padding: 10px;
                    max-width: 100%;
                    overflow: visible;
                }
                
                svg {
                    background-color: #1a1a1a;
                    width: 100%;
                    height: auto;
                    max-width: 100%;
                    margin: 0 auto;
                    display: block;
                }
                
                .seat {
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .seat:hover {
                    opacity: 0.8;
                    transform: scale(1.1);
                }
                
                .seat.selected {
                    stroke-width: 3;
                }
            </style>
        </head>
        <body>
            <div id="seat-map-container">
                <svg viewBox="200 100 1000 900" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <!-- Gradient for seats -->
                        <linearGradient id="seatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#e0e0e0;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#b0b0b0;stop-opacity:1" />
                        </linearGradient>

                        <!-- Gradient for selected seats -->
                        <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#4a90e2;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#357abd;stop-opacity:1" />
                        </linearGradient>

                        <!-- Premium gradient - Gold -->
                        <linearGradient id="premiumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#ffb300;stop-opacity:1" />
                        </linearGradient>

                        <!-- Side sections gradient - Green -->
                        <linearGradient id="sideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#66bb6a;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#43a047;stop-opacity:1" />
                        </linearGradient>

                        <!-- Middle section gradient - Purple -->
                        <linearGradient id="middleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#ab47bc;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#8e24aa;stop-opacity:1" />
                        </linearGradient>

                        <!-- Back section gradient - Orange -->
                        <linearGradient id="backGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:#ff7043;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#f4511e;stop-opacity:1" />
                        </linearGradient>

                        <!-- Shadow filter -->
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
                            <feOffset dx="0" dy="1" result="offsetblur"/>
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.3"/>
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    <!-- Stage -->
                    <path d="M 300 50 L 1100 50 L 1050 130 L 350 130 Z" fill="#2a2a2a" stroke="#444" stroke-width="2"/>
                    <text x="700" y="95" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="28" font-weight="bold">STAGE</text>

                    <!-- Section Labels -->
                    <text x="700" y="170" text-anchor="middle" fill="#FFD700" font-family="Arial, sans-serif" font-size="16" font-weight="bold">PREMIUM SECTION (150 seats)</text>
                    <text x="250" y="200" text-anchor="middle" fill="#ccc" font-family="Arial, sans-serif" font-size="14">SIDE A (50 seats)</text>
                    <text x="1120" y="200" text-anchor="middle" fill="#ccc" font-family="Arial, sans-serif" font-size="14">SIDE B (50 seats)</text>
                    <text x="700" y="480" text-anchor="middle" fill="#ccc" font-family="Arial, sans-serif" font-size="16">MIDDLE SECTION (150 seats)</text>
                    <text x="700" y="800" text-anchor="middle" fill="#ccc" font-family="Arial, sans-serif" font-size="16">BACK SECTION (102 seats)</text>

                    <!-- Seats will be generated by JavaScript -->
                    <g id="seat-container"></g>

                    <!-- Wheelchair accessible spots -->
                    <g transform="translate(440, 195)">
                        <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" stroke-width="1" filter="url(#shadow)" />
                        <text x="0" y="12" text-anchor="middle" fill="white" font-size="16" font-family="Arial, sans-serif">♿</text>
                    </g>
                    <g transform="translate(925, 195)">
                        <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" stroke-width="1" filter="url(#shadow)" />
                        <text x="0" y="12" text-anchor="middle" fill="white" font-size="16" font-family="Arial, sans-serif">♿</text>
                    </g>
                    <g transform="translate(165, 275)">
                        <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" stroke-width="1" filter="url(#shadow)" />
                        <text x="0" y="12" text-anchor="middle" fill="white" font-size="16" font-family="Arial, sans-serif">♿</text>
                    </g>
                    <g transform="translate(1215, 275)">
                        <rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" stroke-width="1" filter="url(#shadow)" />
                        <text x="0" y="12" text-anchor="middle" fill="white" font-size="16" font-family="Arial, sans-serif">♿</text>
                    </g>

                    <!-- Center aisle -->
                    <rect x="690" y="180" width="20" height="820" fill="#2a2a2a" opacity="0.5" />

                    <!-- Side aisles -->
                    <rect x="360" y="260" width="80" height="300" fill="#2a2a2a" opacity="0.3" />
                    <rect x="960" y="260" width="80" height="300" fill="#2a2a2a" opacity="0.3" />
                </svg>
            </div>

            <script>
                let selectedSeats = new Set();
                let allSeats = [];

                // Generate all seats
                function generateSeats() {
                    const seatContainer = document.getElementById('seat-container');
                    
                    // Premium Section - 150 seats (15 cols x 10 rows)
                    const premiumStartX = 475;
                    const premiumStartY = 190;
                    for (let row = 0; row < 10; row++) {
                        for (let col = 0; col < 15; col++) {
                                                    createSeat(
                            `premium-\\${row + 1}-\\${col + 1}`,
                            premiumStartX + col * 30,
                            premiumStartY + row * 28,
                            'premium'
                        );
                        }
                    }

                    // Side Section A - 50 seats (5 cols x 10 rows)
                    const sideAStartX = 290;
                    const sideAStartY = 220;
                    for (let row = 0; row < 10; row++) {
                        for (let col = 0; col < 5; col++) {
                            createSeat(
                                `sideA-\\${row + 1}-\\${col + 1}`,
                                sideAStartX + col * 30,
                                sideAStartY + row * 28,
                                'side'
                            );
                        }
                    }

                    // Side Section B - 50 seats (5 cols x 10 rows)
                    const sideBStartX = 970;
                    const sideBStartY = 220;
                    for (let row = 0; row < 10; row++) {
                        for (let col = 0; col < 5; col++) {
                            createSeat(
                                `sideB-\\${row + 1}-\\${col + 1}`,
                                sideBStartX + col * 30,
                                sideBStartY + row * 28,
                                'side'
                            );
                        }
                    }

                    // Middle Section - 150 seats (15 cols x 10 rows)
                    const middleStartX = 475;
                    const middleStartY = 500;
                    for (let row = 0; row < 10; row++) {
                        for (let col = 0; col < 15; col++) {
                            createSeat(
                                `middle-\\${row + 1}-\\${col + 1}`,
                                middleStartX + col * 30,
                                middleStartY + row * 28,
                                'middle'
                            );
                        }
                    }

                    // Back Section - 102 seats
                    const backStartY = 820;
                    const backRows = [
                        { seats: 14, startX: 490 },
                        { seats: 13, startX: 505 },
                        { seats: 12, startX: 520 },
                        { seats: 11, startX: 535 },
                        { seats: 10, startX: 550 },
                        { seats: 9, startX: 565 },
                        { seats: 9, startX: 565 },
                        { seats: 8, startX: 580 },
                        { seats: 8, startX: 580 },
                        { seats: 8, startX: 580 },
                    ];

                    backRows.forEach((rowConfig, rowIndex) => {
                        for (let col = 0; col < rowConfig.seats; col++) {
                            createSeat(
                                `back-\\${rowIndex + 1}-\\${col + 1}`,
                                rowConfig.startX + col * 30,
                                backStartY + rowIndex * 28,
                                'back'
                            );
                        }
                    });
                }

                function createSeat(seatId, x, y, sectionType) {
                    const seatContainer = document.getElementById('seat-container');
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    
                    rect.setAttribute('id', seatId);
                    rect.setAttribute('x', x);
                    rect.setAttribute('y', y);
                    rect.setAttribute('width', '24');
                    rect.setAttribute('height', '22');
                    rect.setAttribute('rx', '4');
                    rect.setAttribute('stroke-width', '1');
                    rect.setAttribute('filter', 'url(#shadow)');
                    rect.setAttribute('class', 'seat');
                    rect.setAttribute('data-section-type', sectionType);
                    
                    // Set initial colors
                    updateSeatAppearance(rect, sectionType, false);
                    
                    // Add click handler
                    rect.addEventListener('click', function() {
                        handleSeatClick(seatId);
                    });
                    
                    seatContainer.appendChild(rect);
                    allSeats.push({ id: seatId, element: rect, sectionType: sectionType });
                }

                function updateSeatAppearance(rect, sectionType, isSelected) {
                    let fillGradient, strokeColor;
                    
                    if (isSelected) {
                        fillGradient = 'url(#selectedGradient)';
                        strokeColor = '#2e7cd6';
                        rect.classList.add('selected');
                    } else {
                        rect.classList.remove('selected');
                        switch (sectionType) {
                            case 'premium':
                                fillGradient = 'url(#premiumGradient)';
                                strokeColor = '#cc9900';
                                break;
                            case 'side':
                                fillGradient = 'url(#sideGradient)';
                                strokeColor = '#388e3c';
                                break;
                            case 'middle':
                                fillGradient = 'url(#middleGradient)';
                                strokeColor = '#7b1fa2';
                                break;
                            case 'back':
                                fillGradient = 'url(#backGradient)';
                                strokeColor = '#d84315';
                                break;
                            default:
                                fillGradient = 'url(#seatGradient)';
                                strokeColor = '#999';
                        }
                    }
                    
                    rect.setAttribute('fill', fillGradient);
                    rect.setAttribute('stroke', strokeColor);
                }

                function handleSeatClick(seatId) {
                    // Notify Swift
                    window.webkit.messageHandlers.seatTapped.postMessage(seatId);
                }

                function updateSelectedSeats(newSelectedSeats) {
                    selectedSeats = new Set(newSelectedSeats);
                    
                    // Update all seat appearances
                    allSeats.forEach(seat => {
                        const isSelected = selectedSeats.has(seat.id);
                        updateSeatAppearance(seat.element, seat.sectionType, isSelected);
                    });
                }

                // Initialize seats when page loads
                document.addEventListener('DOMContentLoaded', function() {
                    generateSeats();
                });
            </script>
        </body>
        </html>
        """
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let parent: HardcodedSeatMapWebView
        
        init(_ parent: HardcodedSeatMapWebView) {
            self.parent = parent
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "seatTapped", let seatId = message.body as? String {
                parent.onSeatTapped(seatId)
            }
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Initial setup complete
        }
    }
}

#Preview {
    HardcodedSeatMapView(
        selectedSeats: .constant(Set(["premium-1-1", "middle-2-3"])),
        onSeatTapped: { seatId in
            print("Seat tapped: \(seatId)")
        },
        containerSize: CGSize(width: 400, height: 300)
    )
} 