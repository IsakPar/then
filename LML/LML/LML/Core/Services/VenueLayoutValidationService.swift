//
//  VenueLayoutValidationService.swift
//  LML
//
//  Phase 1: JSON Validation Framework
//  Service for validating venue layout JSON files against data models
//

import Foundation

// MARK: - Venue Layout Validation Service
class VenueLayoutValidationService {
    
    static let shared = VenueLayoutValidationService()
    private init() {}
    
    // MARK: - Validation Methods
    
    /// Validate a venue layout from JSON data
    /// Returns detailed validation result with errors and warnings
    func validateVenueLayout(from jsonData: Data) -> ValidationResult {
        var errors: [ValidationError] = []
        var warnings: [ValidationWarning] = []
        
        // Step 1: Test JSON decoding
        let venueLayout: VenueLayout
        do {
            venueLayout = try JSONDecoder().decode(VenueLayout.self, from: jsonData)
        } catch {
            return ValidationResult(
                isValid: false,
                errors: [ValidationError.jsonDecodingFailed(error.localizedDescription)],
                warnings: [],
                layout: nil
            )
        }
        
        // Step 2: Validate layout structure
        do {
            try venueLayout.validate()
        } catch let validationError as VenueLayoutError {
            errors.append(ValidationError.layoutStructureInvalid(validationError.localizedDescription))
        } catch {
            errors.append(ValidationError.unknownValidationError(error.localizedDescription))
        }
        
        // Step 3: Additional comprehensive validation
        validateVenueInfo(venueLayout.venue, errors: &errors, warnings: &warnings)
        validateStage(venueLayout.stage, errors: &errors, warnings: &warnings)
        validateAisles(venueLayout.aisles, errors: &errors, warnings: &warnings)
        validateSectionLabels(venueLayout.sectionLabels, errors: &errors, warnings: &warnings)
        validateAccessibilitySpots(venueLayout.accessibilitySpots, errors: &errors, warnings: &warnings)
        validateSections(venueLayout.sections, errors: &errors, warnings: &warnings)
        validateSeats(venueLayout.seats, sections: venueLayout.sections, viewport: venueLayout.venue.viewport, errors: &errors, warnings: &warnings)
        
        // Step 4: Cross-validation between components
        validateCrossReferences(venueLayout, errors: &errors, warnings: &warnings)
        
        return ValidationResult(
            isValid: errors.isEmpty,
            errors: errors,
            warnings: warnings,
            layout: venueLayout
        )
    }
    
    /// Load and validate venue layout from bundle resource
    func validateBundleResource(filename: String) -> ValidationResult {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            return ValidationResult(
                isValid: false,
                errors: [ValidationError.fileNotFound(filename)],
                warnings: [],
                layout: nil
            )
        }
        
        do {
            let data = try Data(contentsOf: url)
            return validateVenueLayout(from: data)
        } catch {
            return ValidationResult(
                isValid: false,
                errors: [ValidationError.fileReadError(filename, error.localizedDescription)],
                warnings: [],
                layout: nil
            )
        }
    }
    
    /// Validate multiple test venues and return summary
    func validateTestVenues() -> TestSuiteResult {
        let testFiles = [
            "victoria-palace-complete",
            "her-majestys-theatre-complete", 
            "royal-albert-hall-circular"
        ]
        
        var results: [String: ValidationResult] = [:]
        var totalErrors = 0
        var totalWarnings = 0
        
        for filename in testFiles {
            let result = validateBundleResource(filename: filename)
            results[filename] = result
            totalErrors += result.errors.count
            totalWarnings += result.warnings.count
        }
        
        let allValid = results.values.allSatisfy { $0.isValid }
        
        return TestSuiteResult(
            allValid: allValid,
            results: results,
            totalErrors: totalErrors,
            totalWarnings: totalWarnings
        )
    }
}

// MARK: - Individual Validation Methods

private extension VenueLayoutValidationService {
    
    func validateVenueInfo(_ venue: VenueInfo, errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        if venue.id.isEmpty {
            errors.append(.emptyVenueId)
        }
        
        if venue.name.isEmpty {
            errors.append(.emptyVenueName)
        }
        
        if venue.viewport.width <= 0 || venue.viewport.height <= 0 {
            errors.append(.invalidViewportDimensions)
        }
        
        // Check for reasonable viewport size
        if venue.viewport.width < 500 || venue.viewport.height < 400 {
            warnings.append(.smallViewport)
        }
        
        if venue.viewport.width > 5000 || venue.viewport.height > 5000 {
            warnings.append(.largeViewport)
        }
    }
    
    func validateStage(_ stage: StageElement?, errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        guard let stage = stage else {
            warnings.append(.noStage)
            return
        }
        
        if stage.id.isEmpty {
            errors.append(.emptyStageId)
        }
        
        if stage.title.isEmpty {
            warnings.append(.emptyStageTitle)
        }
        
        if stage.dimensions.width <= 0 || stage.dimensions.height <= 0 {
            errors.append(.invalidStageDimensions)
        }
    }
    
    func validateAisles(_ aisles: [AisleElement], errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        let aisleIds = aisles.map { $0.id }
        let uniqueIds = Set(aisleIds)
        
        if aisleIds.count != uniqueIds.count {
            errors.append(.duplicateAisleIds)
        }
        
        for aisle in aisles {
            if aisle.id.isEmpty {
                errors.append(.emptyAisleId)
            }
            
            if aisle.dimensions.width <= 0 || aisle.dimensions.height <= 0 {
                errors.append(.invalidAisleDimensions(aisle.id))
            }
        }
        
        if aisles.isEmpty {
            warnings.append(.noAisles)
        }
    }
    
    func validateSectionLabels(_ labels: [LabelElement], errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        let labelIds = labels.map { $0.id }
        let uniqueIds = Set(labelIds)
        
        if labelIds.count != uniqueIds.count {
            errors.append(.duplicateLabelIds)
        }
        
        for label in labels {
            if label.id.isEmpty {
                errors.append(.emptyLabelId)
            }
            
            if label.text.isEmpty {
                errors.append(.emptyLabelText(label.id))
            }
            
            if label.fontSize <= 0 {
                errors.append(.invalidLabelFontSize(label.id))
            }
            
            if label.fontSize < 8 {
                warnings.append(.smallFontSize(label.id))
            }
            
            if label.fontSize > 50 {
                warnings.append(.largeFontSize(label.id))
            }
        }
    }
    
    func validateAccessibilitySpots(_ spots: [AccessibilitySpot], errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        let spotIds = spots.map { $0.id }
        let uniqueIds = Set(spotIds)
        
        if spotIds.count != uniqueIds.count {
            errors.append(.duplicateAccessibilitySpotIds)
        }
        
        for spot in spots {
            if spot.id.isEmpty {
                errors.append(.emptyAccessibilitySpotId)
            }
        }
        
        if spots.isEmpty {
            warnings.append(.noAccessibilitySpots)
        }
    }
    
    func validateSections(_ sections: [SectionInfo], errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        let sectionIds = sections.map { $0.id }
        let uniqueIds = Set(sectionIds)
        
        if sectionIds.count != uniqueIds.count {
            errors.append(.duplicateSectionIds)
        }
        
        for section in sections {
            if section.id.isEmpty {
                errors.append(.emptySectionId)
            }
            
            if section.name.isEmpty {
                errors.append(.emptySectionName(section.id))
            }
            
            if section.capacity <= 0 {
                errors.append(.invalidSectionCapacity(section.id))
            }
            
            // Validate hex color
            if !isValidHexColor(section.colorHex) {
                errors.append(.invalidSectionColor(section.id))
            }
        }
        
        if sections.isEmpty {
            errors.append(.noSections)
        }
    }
    
    func validateSeats(_ seats: [VenueSeatData], sections: [SectionInfo], viewport: ViewportDimensions, errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        let seatIds = seats.map { $0.id }
        let uniqueIds = Set(seatIds)
        
        if seatIds.count != uniqueIds.count {
            errors.append(.duplicateSeatIds)
        }
        
        let sectionIds = Set(sections.map { $0.id })
        
        for seat in seats {
            if seat.id.isEmpty {
                errors.append(.emptySeatId)
            }
            
            if !sectionIds.contains(seat.sectionId) {
                errors.append(.seatReferencesInvalidSection(seat.id, seat.sectionId))
            }
            
            if seat.number <= 0 {
                errors.append(.invalidSeatNumber(seat.id))
            }
            
            if seat.pricePence < 0 {
                errors.append(.negativeSeatPrice(seat.id))
            }
            
            // Validate position within viewport
            if seat.position.x < 0 || seat.position.x > viewport.width ||
               seat.position.y < 0 || seat.position.y > viewport.height {
                errors.append(.seatOutsideViewport(seat.id))
            }
        }
        
        if seats.isEmpty {
            errors.append(.noSeats)
        }
        
        // Validate seat counts match section capacities
        let seatCountsBySection = Dictionary(grouping: seats, by: { $0.sectionId })
            .mapValues { $0.count }
        
        for section in sections {
            let actualCount = seatCountsBySection[section.id] ?? 0
            if actualCount != section.capacity {
                warnings.append(.seatCountMismatch(section.id, expected: section.capacity, actual: actualCount))
            }
        }
    }
    
    func validateCrossReferences(_ layout: VenueLayout, errors: inout [ValidationError], warnings: inout [ValidationWarning]) {
        let viewport = layout.venue.viewport
        
        // Validate stage position
        if let stage = layout.stage {
            if stage.position.x < 0 || stage.position.x > viewport.width ||
               stage.position.y < 0 || stage.position.y > viewport.height {
                warnings.append(.stageOutsideViewport)
            }
        }
        
        // Validate aisle positions
        for aisle in layout.aisles {
            if aisle.position.x < 0 || aisle.position.x > viewport.width ||
               aisle.position.y < 0 || aisle.position.y > viewport.height {
                warnings.append(.aisleOutsideViewport(aisle.id))
            }
        }
        
        // Validate label positions
        for label in layout.sectionLabels {
            if label.position.x < 0 || label.position.x > viewport.width ||
               label.position.y < 0 || label.position.y > viewport.height {
                warnings.append(.labelOutsideViewport(label.id))
            }
        }
    }
    
    func isValidHexColor(_ hex: String) -> Bool {
        let pattern = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
        return hex.range(of: pattern, options: .regularExpression) != nil
    }
}

// MARK: - Validation Result Models

struct ValidationResult {
    let isValid: Bool
    let errors: [ValidationError]
    let warnings: [ValidationWarning]
    let layout: VenueLayout?
    
    var summary: String {
        var lines = ["Validation Result: \(isValid ? "PASSED" : "FAILED")"]
        
        if !errors.isEmpty {
            lines.append("Errors (\(errors.count)):")
            for error in errors {
                lines.append("  • \(error.description)")
            }
        }
        
        if !warnings.isEmpty {
            lines.append("Warnings (\(warnings.count)):")
            for warning in warnings {
                lines.append("  • \(warning.description)")
            }
        }
        
        return lines.joined(separator: "\n")
    }
}

struct TestSuiteResult {
    let allValid: Bool
    let results: [String: ValidationResult]
    let totalErrors: Int
    let totalWarnings: Int
    
    var summary: String {
        var lines = ["Test Suite Result: \(allValid ? "ALL PASSED" : "SOME FAILED")"]
        lines.append("Total Errors: \(totalErrors)")
        lines.append("Total Warnings: \(totalWarnings)")
        lines.append("")
        
        for (filename, result) in results.sorted(by: { $0.key < $1.key }) {
            lines.append("\(filename): \(result.isValid ? "PASSED" : "FAILED")")
            if !result.isValid {
                for error in result.errors {
                    lines.append("  ❌ \(error.description)")
                }
            }
            if !result.warnings.isEmpty {
                for warning in result.warnings {
                    lines.append("  ⚠️ \(warning.description)")
                }
            }
        }
        
        return lines.joined(separator: "\n")
    }
}

// MARK: - Error Types

enum ValidationError {
    case jsonDecodingFailed(String)
    case layoutStructureInvalid(String)
    case unknownValidationError(String)
    case fileNotFound(String)
    case fileReadError(String, String)
    
    // Venue errors
    case emptyVenueId
    case emptyVenueName
    case invalidViewportDimensions
    
    // Stage errors
    case emptyStageId
    case invalidStageDimensions
    
    // Aisle errors
    case duplicateAisleIds
    case emptyAisleId
    case invalidAisleDimensions(String)
    
    // Label errors
    case duplicateLabelIds
    case emptyLabelId
    case emptyLabelText(String)
    case invalidLabelFontSize(String)
    
    // Accessibility errors
    case duplicateAccessibilitySpotIds
    case emptyAccessibilitySpotId
    
    // Section errors
    case duplicateSectionIds
    case emptySectionId
    case emptySectionName(String)
    case invalidSectionCapacity(String)
    case invalidSectionColor(String)
    case noSections
    
    // Seat errors
    case duplicateSeatIds
    case emptySeatId
    case seatReferencesInvalidSection(String, String)
    case invalidSeatNumber(String)
    case negativeSeatPrice(String)
    case seatOutsideViewport(String)
    case noSeats
    
    var description: String {
        switch self {
        case .jsonDecodingFailed(let message):
            return "JSON decoding failed: \(message)"
        case .layoutStructureInvalid(let message):
            return "Layout structure invalid: \(message)"
        case .unknownValidationError(let message):
            return "Unknown validation error: \(message)"
        case .fileNotFound(let filename):
            return "File not found: \(filename).json"
        case .fileReadError(let filename, let message):
            return "Failed to read \(filename).json: \(message)"
        case .emptyVenueId:
            return "Venue ID cannot be empty"
        case .emptyVenueName:
            return "Venue name cannot be empty"
        case .invalidViewportDimensions:
            return "Viewport dimensions must be positive"
        case .emptyStageId:
            return "Stage ID cannot be empty"
        case .invalidStageDimensions:
            return "Stage dimensions must be positive"
        case .duplicateAisleIds:
            return "Duplicate aisle IDs found"
        case .emptyAisleId:
            return "Aisle ID cannot be empty"
        case .invalidAisleDimensions(let aisleId):
            return "Invalid dimensions for aisle: \(aisleId)"
        case .duplicateLabelIds:
            return "Duplicate label IDs found"
        case .emptyLabelId:
            return "Label ID cannot be empty"
        case .emptyLabelText(let labelId):
            return "Label text cannot be empty for: \(labelId)"
        case .invalidLabelFontSize(let labelId):
            return "Invalid font size for label: \(labelId)"
        case .duplicateAccessibilitySpotIds:
            return "Duplicate accessibility spot IDs found"
        case .emptyAccessibilitySpotId:
            return "Accessibility spot ID cannot be empty"
        case .duplicateSectionIds:
            return "Duplicate section IDs found"
        case .emptySectionId:
            return "Section ID cannot be empty"
        case .emptySectionName(let sectionId):
            return "Section name cannot be empty for: \(sectionId)"
        case .invalidSectionCapacity(let sectionId):
            return "Invalid capacity for section: \(sectionId)"
        case .invalidSectionColor(let sectionId):
            return "Invalid hex color for section: \(sectionId)"
        case .noSections:
            return "Venue must have at least one section"
        case .duplicateSeatIds:
            return "Duplicate seat IDs found"
        case .emptySeatId:
            return "Seat ID cannot be empty"
        case .seatReferencesInvalidSection(let seatId, let sectionId):
            return "Seat \(seatId) references invalid section: \(sectionId)"
        case .invalidSeatNumber(let seatId):
            return "Invalid seat number for: \(seatId)"
        case .negativeSeatPrice(let seatId):
            return "Negative price for seat: \(seatId)"
        case .seatOutsideViewport(let seatId):
            return "Seat outside viewport: \(seatId)"
        case .noSeats:
            return "Venue must have at least one seat"
        }
    }
}

// MARK: - Warning Types

enum ValidationWarning {
    case smallViewport
    case largeViewport
    case noStage
    case emptyStageTitle
    case noAisles
    case smallFontSize(String)
    case largeFontSize(String)
    case noAccessibilitySpots
    case seatCountMismatch(String, expected: Int, actual: Int)
    case stageOutsideViewport
    case aisleOutsideViewport(String)
    case labelOutsideViewport(String)
    
    var description: String {
        switch self {
        case .smallViewport:
            return "Viewport is quite small (< 500x400)"
        case .largeViewport:
            return "Viewport is very large (> 5000x5000)"
        case .noStage:
            return "No stage defined (may be intentional for some venues)"
        case .emptyStageTitle:
            return "Stage has no title"
        case .noAisles:
            return "No aisles defined"
        case .smallFontSize(let labelId):
            return "Small font size for label: \(labelId)"
        case .largeFontSize(let labelId):
            return "Large font size for label: \(labelId)"
        case .noAccessibilitySpots:
            return "No accessibility spots defined"
        case .seatCountMismatch(let sectionId, let expected, let actual):
            return "Seat count mismatch for \(sectionId): expected \(expected), got \(actual)"
        case .stageOutsideViewport:
            return "Stage position is outside viewport"
        case .aisleOutsideViewport(let aisleId):
            return "Aisle outside viewport: \(aisleId)"
        case .labelOutsideViewport(let labelId):
            return "Label outside viewport: \(labelId)"
        }
    }
} 