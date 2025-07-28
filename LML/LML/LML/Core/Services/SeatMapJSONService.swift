//
//  SeatMapJSONService.swift
//  LML
//
//  Service for loading seat maps from VenueLayout JSON files
//  Single source of truth using VenueLayoutModels
//

import Foundation

// MARK: - VenueLayout JSON Service
class SeatMapJSONService {
    static let shared = SeatMapJSONService()
    
    private init() {}
    
    /// Load venue layout from JSON file (VenueLayout format only)
    func loadVenueLayout(filename: String) async -> VenueLayout? {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            print("❌ Venue layout file not found: \(filename).json")
            return nil
        }
        
        do {
            let data = try Data(contentsOf: url)
            let layout = try JSONDecoder().decode(VenueLayout.self, from: data)
            
            // Validate the layout
            try layout.validate()
            print("✅ Venue layout loaded and validated: \(filename)")
            print("🏛️ Venue: \(layout.venue.name)")
            print("🪑 Seats: \(layout.seats.count)")
            
            return layout
        } catch {
            print("❌ Failed to decode venue layout \(filename): \(error.localizedDescription)")
            return nil
        }
    }
}

 