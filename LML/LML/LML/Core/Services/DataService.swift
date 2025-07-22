//
//  DataService.swift
//  LML
//
//  Data service layer for shows and tickets
//  Handles caching, offline support, and data management
//

import Foundation

// MARK: - Data Service Protocol
protocol DataServiceProtocol {
    func getShows() async throws -> [Show]
    func getShow(id: String) async throws -> Show
    func getUserTickets() async throws -> [Ticket]
    func searchShows(query: String) async throws -> [Show]
    func getShowsByCategory(_ category: ShowCategory) async throws -> [Show]
}

// MARK: - Data Service
class DataService: DataServiceProtocol {
    static let shared = DataService()
    
    private let apiClient = APIClient.shared
    private let cacheService = CacheService.shared
    private let config = AppConfiguration.shared
    
    private init() {}
    
    // MARK: - Shows
    
    func getShows() async throws -> [Show] {
        if config.shouldUseMockData {
            return generateMockShows()
        }
        
        // First try to get fresh data from API
        do {
            let shows = try await apiClient.getShows()
            await cacheService.cacheShows(shows)
            return shows
        } catch {
            print("⚠️ API call failed: \(error)")
            
            // Fallback 1: Try valid cached data first
            if let validCachedShows = await cacheService.getCachedShowsOnlyIfValid() {
                print("✅ Using valid cached shows due to API failure")
                return validCachedShows
            }
            
            // Fallback 2: Use expired cached data if available
            if let expiredCachedShows = await cacheService.getCachedShows() {
                print("⚠️ Using expired cached shows due to API failure")
                return expiredCachedShows
            }
            
            // Fallback 3: Use mock data as last resort
            print("⚠️ No cached data available, using mock data as fallback")
            return generateMockShows()
        }
    }
    
    func getShow(id: String) async throws -> Show {
        if config.shouldUseMockData {
            return generateMockShows().first { $0.id == id } ?? generateMockShows().first!
        }
        
        do {
            let show = try await apiClient.getShow(id: id)
            await cacheService.cacheShow(show)
            return show
        } catch {
            if let cachedShow = await cacheService.getCachedShow(id: id) {
                print("⚠️ Using cached show due to network error")
                return cachedShow
            }
            throw error
        }
    }
    
    func searchShows(query: String) async throws -> [Show] {
        let allShows = try await getShows()
        return allShows.filter { show in
            show.title.localizedCaseInsensitiveContains(query) ||
            show.venue.name.localizedCaseInsensitiveContains(query) ||
            show.description.localizedCaseInsensitiveContains(query)
        }
    }
    
    func getShowsByCategory(_ category: ShowCategory) async throws -> [Show] {
        let allShows = try await getShows()
        return allShows.filter { $0.category == category }
    }
    
    // MARK: - Tickets
    
    func getUserTickets() async throws -> [Ticket] {
        if config.shouldUseMockData {
            return generateMockTickets()
        }
        
        do {
            let tickets = try await apiClient.getUserTickets()
            await cacheService.cacheTickets(tickets)
            return tickets
        } catch {
            if let cachedTickets = await cacheService.getCachedTickets() {
                print("⚠️ Using cached tickets due to network error")
                return cachedTickets
            }
            throw error
        }
    }
    
    // MARK: - Mock Data Generation (Development Only)
    
    private func generateMockShows() -> [Show] {
        guard !config.isProductionBuild else {
            print("🚫 Mock data blocked in production build")
            return []
        }
        
        let venues = generateMockVenues()
        let calendar = Calendar.current
        let now = Date()
        
        return [
            Show(
                id: "hamilton-victoria-palace",
                title: "Hamilton",
                venue: venues[0],
                description: "The revolutionary musical about Alexander Hamilton",
                imageURL: "hamilton.jpg",
                category: .musical,
                duration: 2.75 * 3600, // 2h 45m
                ageRating: "PG",
                pricing: PricingInfo(
                    currency: "GBP",
                    minPrice: 3500, // £35
                    maxPrice: 15000, // £150
                    sections: [
                        PriceSection(name: "Premium", price: 15000, availableSeats: 45, totalSeats: 150),
                        PriceSection(name: "Stalls", price: 8500, availableSeats: 28, totalSeats: 120),
                        PriceSection(name: "Circle", price: 5500, availableSeats: 67, totalSeats: 100),
                        PriceSection(name: "Balcony", price: 3500, availableSeats: 89, totalSeats: 80)
                    ]
                ),
                schedule: [
                    ShowTime(
                        id: "hamilton-1",
                        showId: "hamilton-victoria-palace",
                        startTime: calendar.date(byAdding: .day, value: 1, to: now)!,
                        endTime: calendar.date(byAdding: .day, value: 1, to: calendar.date(byAdding: .hour, value: 3, to: now)!)!,
                        isAvailable: true,
                        availableSeats: 229
                    )
                ],
                seatMap: nil,
                isActive: true,
                createdAt: now,
                updatedAt: now
            ),
            Show(
                id: "lion-king-lyceum",
                title: "The Lion King",
                venue: venues[1],
                description: "Disney's award-winning musical spectacular",
                imageURL: "lionking.jpg",
                category: .musical,
                duration: 2.5 * 3600,
                ageRating: "U",
                pricing: PricingInfo(
                    currency: "GBP",
                    minPrice: 2500,
                    maxPrice: 12000,
                    sections: [
                        PriceSection(name: "Premium", price: 12000, availableSeats: 32, totalSeats: 100),
                        PriceSection(name: "Stalls", price: 7500, availableSeats: 45, totalSeats: 150),
                        PriceSection(name: "Circle", price: 4500, availableSeats: 78, totalSeats: 120),
                        PriceSection(name: "Balcony", price: 2500, availableSeats: 95, totalSeats: 100)
                    ]
                ),
                schedule: [
                    ShowTime(
                        id: "lion-king-1",
                        showId: "lion-king-lyceum",
                        startTime: calendar.date(byAdding: .day, value: 2, to: now)!,
                        endTime: calendar.date(byAdding: .day, value: 2, to: calendar.date(byAdding: .hour, value: 3, to: now)!)!,
                        isAvailable: true,
                        availableSeats: 250
                    )
                ],
                seatMap: nil,
                isActive: true,
                createdAt: now,
                updatedAt: now
            )
        ]
    }
    
    private func generateMockVenues() -> [Venue] {
        return [
            Venue(
                id: "victoria-palace",
                name: "Victoria Palace Theatre",
                address: Address(
                    street: "Victoria Street",
                    city: "London",
                    postcode: "SW1E 5EA",
                    country: "UK"
                ),
                capacity: 1500,
                accessibility: AccessibilityInfo(
                    wheelchairAccessible: true,
                    hearingLoopAvailable: true,
                    audioDescriptionAvailable: true,
                    signLanguageAvailable: false
                ),
                facilities: ["Bar", "Restaurant", "Gift Shop", "Cloakroom"]
            ),
            Venue(
                id: "lyceum-theatre",
                name: "Lyceum Theatre",
                address: Address(
                    street: "Wellington Street",
                    city: "London",
                    postcode: "WC2E 7RQ",
                    country: "UK"
                ),
                capacity: 2100,
                accessibility: AccessibilityInfo(
                    wheelchairAccessible: true,
                    hearingLoopAvailable: true,
                    audioDescriptionAvailable: true,
                    signLanguageAvailable: false
                ),
                facilities: ["Bar", "Ice Cream", "Gift Shop"]
            )
        ]
    }
    
    private func generateMockTickets() -> [Ticket] {
        guard !config.isProductionBuild else { return [] }
        
        let calendar = Calendar.current
        let now = Date()
        
        return [
            Ticket(
                id: "ticket-1",
                showName: "Hamilton",
                venueName: "Victoria Palace Theatre",
                showDate: calendar.date(byAdding: .day, value: 7, to: now) ?? now,
                showTime: "7:30 PM",
                seatInfo: "Stalls - Row H, Seats 12-13",
                totalPrice: 17000,
                status: .upcoming,
                bookingReference: "LML123456"
            )
        ]
    }
}

// MARK: - Data Errors
enum DataError: LocalizedError {
    case networkUnavailable
    case cacheExpired
    case invalidData
    case notFound
    
    var errorDescription: String? {
        switch self {
        case .networkUnavailable:
            return "Network unavailable. Showing cached data."
        case .cacheExpired:
            return "Cached data has expired"
        case .invalidData:
            return "Invalid data format received"
        case .notFound:
            return "Requested data not found"
        }
    }
} 