//
//  Show.swift
//  LMLClean
//
//  Show model and mock data
//

import Foundation

struct Show: Identifiable, Codable {
    let id: String
    let title: String
    let venue: String
    let date: String
    let time: String
    let minPrice: Int
    let maxPrice: Int
    let description: String
    let imageUrl: String?
    
    init(id: String, title: String, venue: String, date: String, time: String, minPrice: Int, maxPrice: Int, description: String, imageUrl: String? = nil) {
        self.id = id
        self.title = title
        self.venue = venue
        self.date = date
        self.time = time
        self.minPrice = minPrice
        self.maxPrice = maxPrice
        self.description = description
        self.imageUrl = imageUrl
    }
}

// MARK: - Mock Data
let mockShows: [Show] = [
    Show(
        id: "1",
        title: "Hamilton",
        venue: "Victoria Palace Theatre",
        date: "2024-12-20",
        time: "19:30",
        minPrice: 45,
        maxPrice: 150,
        description: "The acclaimed musical about Alexander Hamilton"
    ),
    Show(
        id: "2", 
        title: "The Lion King",
        venue: "Lyceum Theatre",
        date: "2024-12-21",
        time: "19:30",
        minPrice: 35,
        maxPrice: 120,
        description: "Disney's spectacular musical adventure"
    ),
    Show(
        id: "3",
        title: "Phantom of the Opera",
        venue: "Her Majesty's Theatre", 
        date: "2024-12-22",
        time: "19:30",
        minPrice: 25,
        maxPrice: 95,
        description: "The world's most popular musical"
    ),
    Show(
        id: "4",
        title: "Chicago",
        venue: "Phoenix Theatre",
        date: "2024-12-23", 
        time: "20:00",
        minPrice: 30,
        maxPrice: 85,
        description: "The razzle dazzle musical"
    ),
    Show(
        id: "5",
        title: "Wicked",
        venue: "Apollo Victoria Theatre",
        date: "2024-12-24",
        time: "19:30", 
        minPrice: 40,
        maxPrice: 130,
        description: "The untold story of the Witches of Oz"
    ),
    Show(
        id: "6",
        title: "Mamma Mia!",
        venue: "Novello Theatre",
        date: "2024-12-25",
        time: "19:30",
        minPrice: 28,
        maxPrice: 90,
        description: "The feel-good musical based on ABBA's songs"
    )
] 