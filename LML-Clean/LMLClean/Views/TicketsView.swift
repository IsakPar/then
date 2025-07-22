//
//  TicketsView.swift
//  LMLClean
//
//  Tickets screen - placeholder for now
//

import SwiftUI

struct TicketsView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Image(systemName: "ticket.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                Text("Your Tickets")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("Your purchased tickets will appear here")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Tickets")
        }
    }
}

struct TicketsView_Previews: PreviewProvider {
    static var previews: some View {
        TicketsView()
    }
} 