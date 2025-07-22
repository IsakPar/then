//
//  TicketsView.swift
//  LMLClean
//
//  Tickets screen - dark theme matching Expo design
//

import SwiftUI

struct TicketsView: View {
    var body: some View {
        ZStack {
            // Dark background matching Expo app
            Color(red: 0.067, green: 0.094, blue: 0.153) // #111827
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                Spacer()
                
                Image(systemName: "ticket.fill")
                    .font(.system(size: 60))
                    .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                
                Text("Your Tickets")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text("Your purchased tickets will appear here")
                    .font(.subheadline)
                    .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                
                Spacer()
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct TicketsView_Previews: PreviewProvider {
    static var previews: some View {
        TicketsView()
            .preferredColorScheme(.dark)
    }
} 