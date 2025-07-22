//
//  OfflineDataManager.swift
//  Last Minute Live
//
//  Local-first data manager for caching shows, bookings, and seat maps
//  Implements offline-first loading with background sync capabilities
//

import Foundation
import Combine

// MARK: - Cache Configuration

struct CacheConfiguration {
    let showsCacheDuration: TimeInterval = 30 * 60 // 30 minutes
    let userBookingsCacheDuration: TimeInterval = 10 * 60 // 10 minutes
    let seatMapsCacheDuration: TimeInterval = 24 * 60 * 60 // 24 hours
    let maxCacheSize: Int = 50 * 1024 * 1024 // 50MB
}

// MARK: - Cache Entry

struct CacheEntry<T: Codable>: Codable {
    let data: T
    let timestamp: Date
    let expirationDate: Date
    
    var isExpired: Bool {
        return Date() > expirationDate
    }
}

// MARK: - Offline Data Manager Protocol

protocol OfflineDataManagerProtocol: ObservableObject {
    // Shows
    func cacheShows(_ shows: [Show]) async throws
    func getCachedShows() async throws -> [Show]?
    func getLastShowsSync() -> Date?
    
    // User bookings
    func cacheUserBookings(_ bookings: [UserBooking]) async throws
    func getCachedUserBookings() async throws -> [UserBooking]?
    
    // Seat maps (optional caching for offline review)
    func cacheSeatMap(_ seatMap: SeatMapData, for showId: String) async throws
    func getCachedSeatMap(for showId: String) async throws -> SeatMapData?
    
    // Cache management
    func clearExpiredCache() async throws
    func clearAllCache() async throws
    func getCacheSize() async throws -> Int
    
    // Sync status
    func updateLastSyncTime(for key: String) async
    func getLastSyncTime(for key: String) -> Date?
}

// MARK: - Offline Data Manager Implementation

@MainActor
class OfflineDataManager: OfflineDataManagerProtocol {
    
    // MARK: - Singleton
    
    static let shared = OfflineDataManager()
    
    // MARK: - Published Properties
    
    @Published private(set) var isCaching: Bool = false
    @Published private(set) var cacheSize: Int = 0
    @Published private(set) var lastSyncTimes: [String: Date] = [:]
    
    // MARK: - Private Properties
    
    private let configuration = CacheConfiguration()
    private let fileManager = FileManager.default
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    private lazy var cacheDirectory: URL = {
        let documentsPath = fileManager.urls(for: .documentDirectory, 
                                           in: .userDomainMask).first!
        let cacheDir = documentsPath.appendingPathComponent("OfflineCache")
        
        // Create directory if it doesn't exist
        try? fileManager.createDirectory(at: cacheDir, 
                                       withIntermediateDirectories: true)
        return cacheDir
    }()
    
    private lazy var syncTimesURL: URL = {
        return cacheDirectory.appendingPathComponent("sync_times.json")
    }()
    
    // MARK: - Cache Keys
    
    private enum CacheKey {
        static let shows = "shows"
        static let userBookings = "user_bookings"
        static let seatMapPrefix = "seatmap_"
    }
    
    // MARK: - Initialization
    
    private init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
        
        Task {
            await loadSyncTimes()
            await updateCacheSize()
            
            // Clean expired cache on startup
            try? await clearExpiredCache()
        }
    }
    
    // MARK: - Shows Caching
    
    func cacheShows(_ shows: [Show]) async throws {
        let entry = CacheEntry(
            data: shows,
            timestamp: Date(),
            expirationDate: Date().addingTimeInterval(configuration.showsCacheDuration)
        )
        
        try await cacheData(entry, key: CacheKey.shows)
        await updateLastSyncTime(for: CacheKey.shows)
        
        print("💾 OfflineDataManager: Cached \(shows.count) shows")
    }
    
    func getCachedShows() async throws -> [Show]? {
        let entry: CacheEntry<[Show]>? = try await getCachedData(key: CacheKey.shows)
        
        guard let entry = entry, !entry.isExpired else {
            print("💾 OfflineDataManager: Shows cache expired or not found")
            return nil
        }
        
        print("💾 OfflineDataManager: Retrieved \(entry.data.count) cached shows")
        return entry.data
    }
    
    func getLastShowsSync() -> Date? {
        return getLastSyncTime(for: CacheKey.shows)
    }
    
    // MARK: - User Bookings Caching
    
    func cacheUserBookings(_ bookings: [UserBooking]) async throws {
        let entry = CacheEntry(
            data: bookings,
            timestamp: Date(),
            expirationDate: Date().addingTimeInterval(configuration.userBookingsCacheDuration)
        )
        
        try await cacheData(entry, key: CacheKey.userBookings)
        await updateLastSyncTime(for: CacheKey.userBookings)
        
        print("💾 OfflineDataManager: Cached \(bookings.count) user bookings")
    }
    
    func getCachedUserBookings() async throws -> [UserBooking]? {
        let entry: CacheEntry<[UserBooking]>? = try await getCachedData(key: CacheKey.userBookings)
        
        guard let entry = entry, !entry.isExpired else {
            print("💾 OfflineDataManager: User bookings cache expired or not found")
            return nil
        }
        
        print("💾 OfflineDataManager: Retrieved \(entry.data.count) cached bookings")
        return entry.data
    }
    
    // MARK: - Seat Maps Caching
    
    func cacheSeatMap(_ seatMap: SeatMapData, for showId: String) async throws {
        let entry = CacheEntry(
            data: seatMap,
            timestamp: Date(),
            expirationDate: Date().addingTimeInterval(configuration.seatMapsCacheDuration)
        )
        
        let key = "\(CacheKey.seatMapPrefix)\(showId)"
        try await cacheData(entry, key: key)
        
        print("💾 OfflineDataManager: Cached seat map for show: \(showId)")
    }
    
    func getCachedSeatMap(for showId: String) async throws -> SeatMapData? {
        let key = "\(CacheKey.seatMapPrefix)\(showId)"
        let entry: CacheEntry<SeatMapData>? = try await getCachedData(key: key)
        
        guard let entry = entry, !entry.isExpired else {
            print("💾 OfflineDataManager: Seat map cache expired or not found for show: \(showId)")
            return nil
        }
        
        print("💾 OfflineDataManager: Retrieved cached seat map for show: \(showId)")
        return entry.data
    }
    
    // MARK: - Cache Management
    
    func clearExpiredCache() async throws {
        let cacheFiles = try fileManager.contentsOfDirectory(at: cacheDirectory,
                                                            includingPropertiesForKeys: nil)
        
        var clearedCount = 0
        
        for fileURL in cacheFiles {
            // Skip sync times file
            if fileURL == syncTimesURL {
                continue
            }
            
            do {
                let data = try Data(contentsOf: fileURL)
                
                // Try to decode as any cache entry to check expiration
                if let genericEntry = try? decoder.decode(GenericCacheEntry.self, from: data),
                   genericEntry.isExpired {
                    try fileManager.removeItem(at: fileURL)
                    clearedCount += 1
                }
            } catch {
                // If we can't decode it, it might be corrupted - remove it
                try? fileManager.removeItem(at: fileURL)
                clearedCount += 1
            }
        }
        
        await updateCacheSize()
        
        if clearedCount > 0 {
            print("💾 OfflineDataManager: Cleared \(clearedCount) expired cache entries")
        }
    }
    
    func clearAllCache() async throws {
        let cacheFiles = try fileManager.contentsOfDirectory(at: cacheDirectory,
                                                            includingPropertiesForKeys: nil)
        
        for fileURL in cacheFiles {
            // Skip sync times file
            if fileURL != syncTimesURL {
                try fileManager.removeItem(at: fileURL)
            }
        }
        
        await updateCacheSize()
        print("💾 OfflineDataManager: Cleared all cache")
    }
    
    func getCacheSize() async throws -> Int {
        return cacheSize
    }
    
    // MARK: - Sync Time Management
    
    func updateLastSyncTime(for key: String) async {
        lastSyncTimes[key] = Date()
        await saveSyncTimes()
    }
    
    func getLastSyncTime(for key: String) -> Date? {
        return lastSyncTimes[key]
    }
    
    // MARK: - Private Helper Methods
    
    private func cacheData<T: Codable>(_ entry: CacheEntry<T>, key: String) async throws {
        isCaching = true
        defer { isCaching = false }
        
        let data = try encoder.encode(entry)
        let fileURL = cacheDirectory.appendingPathComponent("\(key).json")
        
        try data.write(to: fileURL)
        await updateCacheSize()
    }
    
    private func getCachedData<T: Codable>(key: String) async throws -> CacheEntry<T>? {
        let fileURL = cacheDirectory.appendingPathComponent("\(key).json")
        
        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }
        
        let data = try Data(contentsOf: fileURL)
        return try decoder.decode(CacheEntry<T>.self, from: data)
    }
    
    private func updateCacheSize() async {
        do {
            let cacheFiles = try fileManager.contentsOfDirectory(at: cacheDirectory,
                                                                includingPropertiesForKeys: [.fileSizeKey])
            
            let totalSize = cacheFiles.reduce(0) { total, url in
                let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
                return total + size
            }
            
            cacheSize = totalSize
            
        } catch {
            print("💾 OfflineDataManager: Failed to calculate cache size: \(error)")
            cacheSize = 0
        }
    }
    
    private func loadSyncTimes() async {
        do {
            let data = try Data(contentsOf: syncTimesURL)
            lastSyncTimes = try decoder.decode([String: Date].self, from: data)
        } catch {
            lastSyncTimes = [:]
        }
    }
    
    private func saveSyncTimes() async {
        do {
            let data = try encoder.encode(lastSyncTimes)
            try data.write(to: syncTimesURL)
        } catch {
            print("💾 OfflineDataManager: Failed to save sync times: \(error)")
        }
    }
}

// MARK: - Generic Cache Entry for Expiration Checking

private struct GenericCacheEntry: Codable {
    let timestamp: Date
    let expirationDate: Date
    
    var isExpired: Bool {
        return Date() > expirationDate
    }
} 