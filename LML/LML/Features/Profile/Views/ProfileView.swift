//
//  ProfileView.swift
//  LML
//
//  Profile view placeholder - to be fully implemented in Phase 6
//

import SwiftUI

struct ProfileView: View {
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Profile View")
                .font(.title)
                .foregroundColor(.blue)
            
            Text("Account settings and preferences")
                .font(.body)
                .foregroundColor(.gray)
            
            Text("Phase 6 Implementation")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .navigationTitle("Profile")
    }
}

#Preview {
    ProfileView()
} 