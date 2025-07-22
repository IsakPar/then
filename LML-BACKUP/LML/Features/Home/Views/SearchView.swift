//
//  SearchView.swift
//  LML
//
//  Search view placeholder - to be fully implemented in Phase 4
//

import SwiftUI

struct SearchView: View {
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Search View")
                .font(.title)
                .foregroundColor(.blue)
            
            Text("Search shows and venues")
                .font(.body)
                .foregroundColor(.gray)
            
            Text("Phase 4 Implementation")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .navigationTitle("Search")
    }
}

#Preview {
    SearchView()
} 