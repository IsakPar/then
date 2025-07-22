//
//  AccountView.swift
//  LMLClean
//
//  Account screen - dark theme matching Expo design
//

import SwiftUI

struct AccountView: View {
    var body: some View {
        ZStack {
            // Dark background matching Expo app
            Color(red: 0.067, green: 0.094, blue: 0.153) // #111827
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Spacer()
                
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                
                Text("Account")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text("Sign in to manage your account and view your bookings")
                    .font(.subheadline)
                    .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                
                Button(action: {
                    print("Sign In tapped")
                }) {
                    Text("Sign In")
                        .foregroundColor(.white)
                        .font(.system(size: 16, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)
                
                Spacer()
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct AccountView_Previews: PreviewProvider {
    static var previews: some View {
        AccountView()
            .preferredColorScheme(.dark)
    }
} 