//
//  CacheService.swift
//  LML
//
//  Cache service for offline support and performance
//  Handles data persistence and cache management
//

import Foundation

// MARK: - Cache Service Protocol
protocol CacheServiceProtocol {
    func cacheShows(_ shows: [Show]) async
    func getCachedShows() async -> [Show]?
    func getCachedShowsOnlyIfValid() async -> [Show]?
    func cacheShow(_ show: Show) async
    func getCachedShow(id: String) async -> Show?
    func cacheTickets(_ tickets: [Ticket]) async
    func getCachedTickets() async -> [Ticket]?
    func clearCache() async
    func isCacheValid(for key: String) async -> Bool
}

// MARK: - Cache Service
actor CacheService: CacheServiceProtocol {
    static let shared = CacheService()
    
    private let userDefaults = UserDefaults.standard
    private let cacheExpiryDuration: TimeInterval = 24 * 60 * 60 // 24 hours
    
    private enum CacheKeys {
        static let shows = "cached_shows"
        static let showsTimestamp = "cached_shows_timestamp"
        static let tickets = "cached_tickets"
        static let ticketsTimestamp = "cached_tickets_timestamp"
        static let showPrefix = "cached_show_"
        static let showTimestampPrefix = "cached_show_timestamp_"
    }
    
    private init() {}
    
    // MARK: - Shows Cache
    
    func cacheShows(_ shows: [Show]) async {
        do {
            let data = try JSONEncoder().encode(shows)
            userDefaults.set(data, forKey: CacheKeys.shows)
            userDefaults.set(Date().timeIntervalSince1970, forKey: CacheKeys.showsTimestamp)
            print("✅ Cached \(shows.count) shows")
        } catch {
            print("❌ Failed to cache shows: \(error)")
        }
    }
    
    func getCachedShows() async -> [Show]? {
        guard let data = userDefaults.data(forKey: CacheKeys.shows) else {
            return nil
        }
        
        do {
            let shows = try JSONDecoder().decode([Show].self, from: data)
            
            let isValid = await isCacheValid(for: CacheKeys.shows)
            if isValid {
                print("✅ Retrieved \(shows.count) cached shows (fresh)")
            } else {
                print("⚠️ Retrieved \(shows.count) cached shows (expired but available)")
            }
            return shows
        } catch {
            print("❌ Failed to decode cached shows: \(error)")
            return nil
        }
    }
    
    func getCachedShowsOnlyIfValid() async -> [Show]? {
        guard await isCacheValid(for: CacheKeys.shows) else {
            print("⏰ Shows cache expired")
            return nil
        }
        
        return await getCachedShows()
    }
    
    func cacheShow(_ show: Show) async {
        do {
            let data = try JSONEncoder().encode(show)
            let key = CacheKeys.showPrefix + show.id
            let timestampKey = CacheKeys.showTimestampPrefix + show.id
            
            userDefaults.set(data, forKey: key)
            userDefaults.set(Date().timeIntervalSince1970, forKey: timestampKey)
            print("✅ Cached show: \(show.title)")
        } catch {
            print("❌ Failed to cache show: \(error)")
        }
    }
    
    func getCachedShow(id: String) async -> Show? {
        let key = CacheKeys.showPrefix + id
        let timestampKey = CacheKeys.showTimestampPrefix + id
        
        guard await isCacheValid(for: key, timestampKey: timestampKey) else {
            print("⏰ Show cache expired for: \(id)")
            return nil
        }
        
        guard let data = userDefaults.data(forKey: key) else {
            return nil
        }
        
        do {
            let show = try JSONDecoder().decode(Show.self, from: data)
            print("✅ Retrieved cached show: \(show.title)")
            return show
        } catch {
            print("❌ Failed to decode cached show: \(error)")
            return nil
        }
    }
    
    // MARK: - Tickets Cache
    
    func cacheTickets(_ tickets: [Ticket]) async {
        do {
            let data = try JSONEncoder().encode(tickets)
            userDefaults.set(data, forKey: CacheKeys.tickets)
            userDefaults.set(Date().timeIntervalSince1970, forKey: CacheKeys.ticketsTimestamp)
            print("✅ Cached \(tickets.count) tickets")
        } catch {
            print("❌ Failed to cache tickets: \(error)")
        }
    }
    
    func getCachedTickets() async -> [Ticket]? {
        guard await isCacheValid(for: CacheKeys.tickets) else {
            print("⏰ Tickets cache expired")
            return nil
        }
        
        guard let data = userDefaults.data(forKey: CacheKeys.tickets) else {
            return nil
        }
        
        do {
            let tickets = try JSONDecoder().decode([Ticket].self, from: data)
            print("✅ Retrieved \(tickets.count) cached tickets")
            return tickets
        } catch {
            print("❌ Failed to decode cached tickets: \(error)")
            return nil
        }
    }
    
    // MARK: - Cache Management
    
    func clearCache() async {
        let keys = [
            CacheKeys.shows,
            CacheKeys.showsTimestamp,
            CacheKeys.tickets,
            CacheKeys.ticketsTimestamp
        ]
        
        for key in keys {
            userDefaults.removeObject(forKey: key)
        }
        
        // Clear individual show caches
        let allKeys = userDefaults.dictionaryRepresentation().keys
        for key in allKeys {
            if key.hasPrefix(CacheKeys.showPrefix) || key.hasPrefix(CacheKeys.showTimestampPrefix) {
                userDefaults.removeObject(forKey: key)
            }
        }
        
        print("✅ Cache cleared")
    }
    
    func isCacheValid(for key: String) async -> Bool {
        let timestampKey = key + "_timestamp"
        return await isCacheValid(for: key, timestampKey: timestampKey)
    }
    
    private func isCacheValid(for key: String, timestampKey: String) async -> Bool {
        let timestamp = userDefaults.double(forKey: timestampKey)
        let now = Date().timeIntervalSince1970
        return (now - timestamp) < cacheExpiryDuration
    }
} 