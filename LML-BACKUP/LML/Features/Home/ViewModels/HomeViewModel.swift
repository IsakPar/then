//
//  HomeViewModel.swift
//  Last Minute Live
//
//  View model for HomeView implementing local-first show discovery
//  Handles caching, filtering, search, and offline-first data loading
//

import Foundation
import Combine
import SwiftUI
import Network

// MARK: - Quick Filter Types

enum QuickFilterType: String, CaseIterable {
    case all = "all"
    case tonight = "tonight"
    case thisWeek = "this_week"
    case weekend = "weekend"
    case musicals = "musicals"
    case plays = "plays"
    case lowPrice = "low_price"
}

struct QuickFilter {
    let type: QuickFilterType
    let title: String
    let icon: String
}

@MainActor
class HomeViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var shows: [Show] = []
    @Published var filteredShows: [Show] = []
    @Published var isLoading: Bool = false
    @Published var isOfflineMode: Bool = false
    @Published var errorMessage: String?
    @Published var searchQuery: String = ""
    @Published var selectedFilter: QuickFilterType = .all
    @Published var showCacheStatus: Bool = false
    @Published var lastSyncText: String = "Never"
    @Published var cacheSizeText: String = "0 KB"
    
    // MARK: - Computed Properties
    
    var availableShowsCount: Int {
        return shows.filter { $0.isActive }.count
    }
    
    var tonightShowsCount: Int {
        let today = Calendar.current.startOfDay(for: Date())
        return shows.filter { show in
            guard let showDate = DateFormatter.yearMonthDay.date(from: show.date) else { return false }
            return Calendar.current.isDate(showDate, inSameDayAs: today) && show.isActive
        }.count
    }
    
    var thisWeekShowsCount: Int {
        let now = Date()
        let endOfWeek = Calendar.current.date(byAdding: .day, value: 7, to: now) ?? now
        return shows.filter { show in
            guard let showDate = DateFormatter.yearMonthDay.date(from: show.date) else { return false }
            return showDate >= now && showDate <= endOfWeek && show.isActive
        }.count
    }
    
    let quickFilters: [QuickFilter] = [
        QuickFilter(type: .all, title: "All", icon: "square.grid.2x2"),
        QuickFilter(type: .tonight, title: "Tonight", icon: "moon"),
        QuickFilter(type: .thisWeek, title: "This Week", icon: "calendar"),
        QuickFilter(type: .weekend, title: "Weekend", icon: "calendar.badge.clock"),
        QuickFilter(type: .musicals, title: "Musicals", icon: "music.note"),
        QuickFilter(type: .plays, title: "Plays", icon: "theatermasks"),
        QuickFilter(type: .lowPrice, title: "Under £50", icon: "tag")
    ]
    
    // MARK: - Private Properties
    
    private var authManager: AuthManager?
    private var cancellables = Set<AnyCancellable>()
    private let offlineDataManager = OfflineDataManager.shared
    private let networkMonitor = NWPathMonitor()
    private let networkQueue = DispatchQueue(label: "NetworkMonitor")
    private var apiClient: APIClientProtocol?
    
    // MARK: - Initialization
    
    init() {
        setupSearchAndFiltering()
        setupNetworkMonitoring()
        setupCacheStatusUpdates()
    }
    
    deinit {
        networkMonitor.cancel()
    }
    
    // MARK: - Setup Methods
    
    func setAuthManager(_ authManager: AuthManager) {
        self.authManager = authManager
        // Set up API client from auth manager if available
        // self.apiClient = authManager.apiClient
    }
    
    private func setupSearchAndFiltering() {
        // Combine search query and selected filter to update filtered shows
        Publishers.CombineLatest($searchQuery.debounce(for: .milliseconds(300), scheduler: RunLoop.main),
                                $selectedFilter)
            .combineLatest($shows)
            .map { (searchAndFilter, shows) in
                let (searchQuery, selectedFilter) = searchAndFilter
                return self.filterShows(shows, searchQuery: searchQuery, filter: selectedFilter)
            }
            .assign(to: &$filteredShows)
    }
    
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                let wasOffline = self?.isOfflineMode ?? false
                self?.isOfflineMode = path.status != .satisfied
                
                // If we just came back online, refresh shows
                if wasOffline && !(self?.isOfflineMode ?? true) {
                    Task {
                        await self?.refreshShows(force: false)
                    }
                }
            }
        }
        networkMonitor.start(queue: networkQueue)
    }
    
    private func setupCacheStatusUpdates() {
        // Update cache status every 5 seconds when visible
        Timer.publish(every: 5, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                if self?.showCacheStatus == true {
                    Task {
                        await self?.updateCacheStatus()
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading (Local-First Implementation)
    
    func loadShows() async {
        setLoading(true)
        clearError()
        
        // Step 1: Load from cache first (local-first principle)
        do {
            if let cachedShows = try await offlineDataManager.getCachedShows() {
                shows = cachedShows
                print("🏠 HomeViewModel: Loaded \(cachedShows.count) shows from cache")
                
                // Update cache status
                await updateCacheStatus()
                
                // If we have cached data and we're offline, we're done
                if isOfflineMode {
                    setLoading(false)
                    return
                }
            }
        } catch {
            print("🏠 HomeViewModel: Failed to load cached shows: \(error)")
        }
        
        // Step 2: Try to sync with server if online
        if !isOfflineMode {
            await refreshShows(force: false)
        } else {
            setLoading(false)
        }
    }
    
    func refreshShows(force: Bool) async {
        // Don't refresh if offline unless forced
        if isOfflineMode && !force {
            setLoading(false)
            return
        }
        
        setLoading(true)
        clearError()
        
        do {
            // Simulate API call for now - replace with actual API client call
            let freshShows = try await fetchShowsFromAPI()
            
            // Update local data
            shows = freshShows
            
            // Cache the fresh data
            try await offlineDataManager.cacheShows(freshShows)
            
            // Update cache status
            await updateCacheStatus()
            
            print("🏠 HomeViewModel: Refreshed \(freshShows.count) shows from API")
            
        } catch {
            handleNetworkError(error)
        }
        
        setLoading(false)
    }
    
    // MARK: - Search and Filtering
    
    func updateSearchQuery(_ query: String) {
        searchQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    func selectFilter(_ filter: QuickFilterType) {
        selectedFilter = filter
    }
    
    private func filterShows(_ shows: [Show], searchQuery: String, filter: QuickFilterType) -> [Show] {
        var filtered = shows
        
        // Apply text search
        if !searchQuery.isEmpty {
            filtered = filtered.filter { show in
                show.title.localizedCaseInsensitiveContains(searchQuery) ||
                show.venueName.localizedCaseInsensitiveContains(searchQuery) ||
                (show.description?.localizedCaseInsensitiveContains(searchQuery) ?? false)
            }
        }
        
        // Apply quick filter
        switch filter {
        case .all:
            filtered = filtered.filter { $0.isActive }
            
        case .tonight:
            let today = Calendar.current.startOfDay(for: Date())
            filtered = filtered.filter { show in
                guard let showDate = DateFormatter.yearMonthDay.date(from: show.date) else { return false }
                return Calendar.current.isDate(showDate, inSameDayAs: today) && show.isActive
            }
            
        case .thisWeek:
            let now = Date()
            let endOfWeek = Calendar.current.date(byAdding: .day, value: 7, to: now) ?? now
            filtered = filtered.filter { show in
                guard let showDate = DateFormatter.yearMonthDay.date(from: show.date) else { return false }
                return showDate >= now && showDate <= endOfWeek && show.isActive
            }
            
        case .weekend:
            filtered = filtered.filter { show in
                guard let showDate = DateFormatter.yearMonthDay.date(from: show.date) else { return false }
                let weekday = Calendar.current.component(.weekday, from: showDate)
                return (weekday == 1 || weekday == 7) && show.isActive // Sunday = 1, Saturday = 7
            }
            
        case .musicals:
            filtered = filtered.filter { show in
                show.title.localizedCaseInsensitiveContains("musical") ||
                show.description?.localizedCaseInsensitiveContains("musical") ?? false ||
                show.title.localizedCaseInsensitiveContains("wicked") ||
                show.title.localizedCaseInsensitiveContains("lion king") ||
                show.title.localizedCaseInsensitiveContains("mamma mia") && show.isActive
            }
            
        case .plays:
            filtered = filtered.filter { show in
                !show.title.localizedCaseInsensitiveContains("musical") && show.isActive
            }
            
        case .lowPrice:
            filtered = filtered.filter { show in
                show.minPrice <= 5000 && show.isActive // £50 in pence
            }
        }
        
        return filtered.sorted { $0.date < $1.date }
    }
    
    // MARK: - Cache Management
    
    func toggleCacheStatusDisplay() {
        showCacheStatus.toggle()
        if showCacheStatus {
            Task {
                await updateCacheStatus()
            }
        }
    }
    
    private func updateCacheStatus() async {
        do {
            // Update last sync time
            if let lastSync = offlineDataManager.getLastShowsSync() {
                lastSyncText = RelativeDateTimeFormatter().localizedString(for: lastSync, relativeTo: Date())
            } else {
                lastSyncText = "Never"
            }
            
            // Update cache size
            let cacheSize = try await offlineDataManager.getCacheSize()
            cacheSizeText = ByteCountFormatter.string(fromByteCount: Int64(cacheSize), countStyle: .file)
            
        } catch {
            print("🏠 HomeViewModel: Failed to update cache status: \(error)")
        }
    }
    
    // MARK: - Mock API (Replace with real API client)
    
    private func fetchShowsFromAPI() async throws -> [Show] {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        // Return mock shows - replace with actual API call
        return generateMockShows()
    }
    
    private func generateMockShows() -> [Show] {
        // Hamilton removed from mock data as it's now real database data
        let shows = [
            Show(
                id: "1",
                title: "The Lion King",
                description: "Disney's spectacular musical adaptation",
                date: "2024-01-15",
                time: "14:30",
                imageUrl: nil,
                venueId: "venue1",
                venueName: "Lyceum Theatre",
                venueAddress: "Wellington Street, London",
                seatMapId: "map1",
                minPrice: 3500, // £35
                maxPrice: 12000, // £120
                isActive: true,
                seatPricing: nil,
                durationMinutes: 150
            ),
            Show(
                id: "2",
                title: "Wicked",
                description: "The untold story of the witches of Oz",
                date: "2024-01-16",
                time: "19:30",
                imageUrl: nil,
                venueId: "venue2",
                venueName: "Apollo Victoria Theatre",
                venueAddress: "Wilton Road, London",
                seatMapId: "map2",
                minPrice: 4000, // £40
                maxPrice: 14000, // £140
                isActive: true,
                seatPricing: nil,
                durationMinutes: 165
            ),
            Show(
                id: "3",
                title: "The Phantom of the Opera",
                description: "Andrew Lloyd Webber's timeless musical",
                date: "2024-01-17",
                time: "19:30",
                imageUrl: nil,
                venueId: "venue3",
                venueName: "Her Majesty's Theatre",
                venueAddress: "Haymarket, London",
                seatMapId: "map3",
                minPrice: 3000, // £30
                maxPrice: 10000, // £100
                isActive: true,
                seatPricing: nil,
                durationMinutes: 145
            )
        ]
        
        return shows
    }
    
    // MARK: - Error Handling
    
    private func handleNetworkError(_ error: Error) {
        if isOfflineMode {
            setError("You're offline. Showing saved shows.")
        } else {
            setError("Failed to load shows. Please try again.")
        }
        print("🏠 HomeViewModel: Network error: \(error)")
    }
    
    private func setLoading(_ loading: Bool) {
        isLoading = loading
    }
    
    private func setError(_ message: String) {
        errorMessage = message
    }
    
    private func clearError() {
        errorMessage = nil
    }
}

// MARK: - Date Formatter Extension

private extension DateFormatter {
    static let yearMonthDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}
