//
//  SignUpView.swift
//  LML
//
//  Sign-up form with comprehensive validation
//

import SwiftUI

struct SignUpView: View {
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var authManager = AuthManager.shared
    
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var agreeToTerms = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingTerms = false
    
    private var isFormValid: Bool {
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        isValidEmail(email) &&
        isValidPassword(password) &&
        agreeToTerms
    }
    
    private var passwordStrength: PasswordStrength {
        return getPasswordStrength(password)
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Dark background
                Color(red: 0.067, green: 0.094, blue: 0.153) // #111827
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 32) {
                        // Header
                        VStack(spacing: 16) {
                            Image(systemName: "star.circle.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.blue)
                            
                            Text("Join Last Minute Live!")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            
                            Text("Create your account to save tickets, get show recommendations, and never miss out!")
                                .font(.body)
                                .foregroundColor(.white.opacity(0.7))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 40)
                        }
                        .padding(.top, 40)
                        
                        // Sign Up Form
                        VStack(spacing: 20) {
                            // Name Fields
                            HStack(spacing: 12) {
                                // First Name
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("First Name")
                                        .font(.headline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white)
                                    
                                    TextField("First", text: $firstName)
                                        .textFieldStyle(CustomTextFieldStyle())
                                        .autocapitalization(.words)
                                        .autocorrectionDisabled()
                                }
                                
                                // Last Name
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Last Name")
                                        .font(.headline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white)
                                    
                                    TextField("Last", text: $lastName)
                                        .textFieldStyle(CustomTextFieldStyle())
                                        .autocapitalization(.words)
                                        .autocorrectionDisabled()
                                }
                            }
                            
                            // Email Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.headline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.white)
                                
                                TextField("Enter your email", text: $email)
                                    .textFieldStyle(CustomTextFieldStyle())
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .autocorrectionDisabled()
                                
                                // Email validation indicator
                                if !email.isEmpty {
                                    HStack {
                                        Image(systemName: isValidEmail(email) ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .foregroundColor(isValidEmail(email) ? .green : .red)
                                            .font(.caption)
                                        
                                        Text(isValidEmail(email) ? "Valid email address" : "Please enter a valid email")
                                            .font(.caption)
                                            .foregroundColor(isValidEmail(email) ? .green : .red)
                                    }
                                }
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.headline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.white)
                                
                                SecureField("Create a password", text: $password)
                                    .textFieldStyle(CustomTextFieldStyle())
                                
                                // Password strength indicator
                                if !password.isEmpty {
                                    VStack(alignment: .leading, spacing: 8) {
                                        HStack {
                                            Text("Password Strength:")
                                                .font(.caption)
                                                .foregroundColor(.white.opacity(0.7))
                                            
                                            Text(passwordStrength.text)
                                                .font(.caption)
                                                .fontWeight(.semibold)
                                                .foregroundColor(passwordStrength.color)
                                        }
                                        
                                        // Password strength bar
                                        HStack(spacing: 4) {
                                            ForEach(0..<4, id: \.self) { index in
                                                Rectangle()
                                                    .frame(height: 4)
                                                    .foregroundColor(index < passwordStrength.score ? passwordStrength.color : Color.white.opacity(0.2))
                                                    .clipShape(Capsule())
                                            }
                                        }
                                        
                                        // Password requirements
                                        VStack(alignment: .leading, spacing: 4) {
                                            PasswordRequirement(
                                                text: "At least 8 characters",
                                                isValid: password.count >= 8
                                            )
                                            PasswordRequirement(
                                                text: "Contains uppercase letter",
                                                isValid: password.range(of: "[A-Z]", options: .regularExpression) != nil
                                            )
                                            PasswordRequirement(
                                                text: "Contains lowercase letter",
                                                isValid: password.range(of: "[a-z]", options: .regularExpression) != nil
                                            )
                                            PasswordRequirement(
                                                text: "Contains number",
                                                isValid: password.range(of: "[0-9]", options: .regularExpression) != nil
                                            )
                                        }
                                    }
                                }
                            }
                            
                            // Confirm Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Confirm Password")
                                    .font(.headline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.white)
                                
                                SecureField("Confirm your password", text: $confirmPassword)
                                    .textFieldStyle(CustomTextFieldStyle())
                                
                                // Password match indicator
                                if !confirmPassword.isEmpty {
                                    HStack {
                                        Image(systemName: password == confirmPassword ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .foregroundColor(password == confirmPassword ? .green : .red)
                                            .font(.caption)
                                        
                                        Text(password == confirmPassword ? "Passwords match" : "Passwords don't match")
                                            .font(.caption)
                                            .foregroundColor(password == confirmPassword ? .green : .red)
                                    }
                                }
                            }
                            
                            // Terms and Conditions
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(alignment: .top, spacing: 12) {
                                    Button(action: { agreeToTerms.toggle() }) {
                                        Image(systemName: agreeToTerms ? "checkmark.square.fill" : "square")
                                            .foregroundColor(agreeToTerms ? .blue : .white.opacity(0.6))
                                            .font(.title3)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("I agree to the Terms of Service and Privacy Policy")
                                            .font(.footnote)
                                            .foregroundColor(.white.opacity(0.9))
                                        
                                        Button("Read Terms & Privacy Policy") {
                                            showingTerms = true
                                        }
                                        .font(.caption)
                                        .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                        
                        // Error Message
                        if let errorMessage = errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding(.horizontal, 24)
                        }
                        
                        // Sign Up Button
                        VStack(spacing: 16) {
                            Button(action: signUp) {
                                HStack {
                                    if isLoading {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                            .tint(.white)
                                    } else {
                                        Image(systemName: "star.fill")
                                    }
                                    Text(isLoading ? "Creating account..." : "Create Account")
                                        .fontWeight(.semibold)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(
                                    LinearGradient(
                                        colors: [Color.green, Color.blue],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                            .disabled(!isFormValid || isLoading)
                            .opacity((!isFormValid || isLoading) ? 0.6 : 1.0)
                        }
                        .padding(.horizontal, 24)
                        
                        // Divider
                        HStack {
                            Rectangle()
                                .frame(height: 1)
                                .foregroundColor(.white.opacity(0.2))
                            Text("OR")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.white.opacity(0.6))
                                .padding(.horizontal, 12)
                            Rectangle()
                                .frame(height: 1)
                                .foregroundColor(.white.opacity(0.2))
                        }
                        .padding(.horizontal, 24)
                        
                        // Social Authentication
                        VStack(spacing: 12) {
                            // Apple Sign-In
                            Button(action: signUpWithApple) {
                                HStack {
                                    Image(systemName: "apple.logo")
                                        .font(.title2)
                                    Text("Sign up with Apple")
                                        .fontWeight(.medium)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Color.black)
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            
                            // Google Sign-In
                            Button(action: signUpWithGoogle) {
                                HStack {
                                    Image(systemName: "globe")
                                        .font(.title2)
                                    Text("Sign up with Google")
                                        .fontWeight(.medium)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Color.white)
                                .foregroundColor(.black)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(.horizontal, 24)
                        
                        // Sign In Link
                        VStack(spacing: 8) {
                            Rectangle()
                                .frame(height: 1)
                                .foregroundColor(.white.opacity(0.1))
                                .padding(.horizontal, 24)
                            
                            HStack {
                                Text("Already have an account?")
                                    .font(.footnote)
                                    .foregroundColor(.white.opacity(0.7))
                                
                                Button("Sign In") {
                                    presentationMode.wrappedValue.dismiss()
                                    // This would trigger the sign in flow in the parent
                                }
                                .font(.footnote)
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)
                            }
                            .padding(.vertical, 16)
                        }
                        
                        Spacer(minLength: 60)
                    }
                }
            }
            .navigationTitle("Sign Up")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }
                .foregroundColor(.white)
            )
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showingTerms) {
            TermsAndPrivacyView()
        }
        .onChange(of: authManager.authState) { state in
            if case .authenticated = state {
                presentationMode.wrappedValue.dismiss()
            }
        }
    }
    
    // MARK: - Actions
    
    private func signUp() {
        guard isFormValid else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await authManager.signUp(
                    email: email,
                    password: password,
                    firstName: firstName,
                    lastName: lastName
                )
                await MainActor.run {
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func signUpWithApple() {
        Task {
            do {
                try await authManager.signInWithApple()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
    
    private func signUpWithGoogle() {
        Task {
            do {
                try await authManager.signInWithGoogle()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
    
    // MARK: - Validation
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        return NSPredicate(format: "SELF MATCHES %@", emailRegex).evaluate(with: email)
    }
    
    private func isValidPassword(_ password: String) -> Bool {
        return password.count >= 8 &&
               password.range(of: "[A-Z]", options: .regularExpression) != nil &&
               password.range(of: "[a-z]", options: .regularExpression) != nil &&
               password.range(of: "[0-9]", options: .regularExpression) != nil
    }
    
    private func getPasswordStrength(_ password: String) -> PasswordStrength {
        var score = 0
        
        if password.count >= 8 { score += 1 }
        if password.range(of: "[A-Z]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[a-z]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[0-9]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[^A-Za-z0-9]", options: .regularExpression) != nil { score += 1 }
        
        switch score {
        case 0...1:
            return PasswordStrength(score: 1, text: "Weak", color: .red)
        case 2...3:
            return PasswordStrength(score: 2, text: "Fair", color: .orange)
        case 4:
            return PasswordStrength(score: 3, text: "Good", color: .yellow)
        case 5:
            return PasswordStrength(score: 4, text: "Strong", color: .green)
        default:
            return PasswordStrength(score: 1, text: "Weak", color: .red)
        }
    }
}

// MARK: - Supporting Views and Models

struct CustomTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.body)
            .frame(height: 50)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                    )
            )
            .foregroundColor(.white)
    }
}

struct PasswordRequirement: View {
    let text: String
    let isValid: Bool
    
    var body: some View {
        HStack {
            Image(systemName: isValid ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isValid ? .green : .white.opacity(0.4))
                .font(.caption2)
            
            Text(text)
                .font(.caption2)
                .foregroundColor(isValid ? .green : .white.opacity(0.7))
        }
    }
}

struct PasswordStrength {
    let score: Int
    let text: String
    let color: Color
}

struct TermsAndPrivacyView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Terms of Service & Privacy Policy")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Text("By creating an account, you agree to our terms and privacy policy...")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.8))
                    
                    // Add actual terms content here
                    Text("Full terms and privacy policy content would go here.")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(24)
            }
            .background(Color(red: 0.067, green: 0.094, blue: 0.153))
            .navigationTitle("Legal")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    presentationMode.wrappedValue.dismiss()
                }
                .foregroundColor(.blue)
            )
        }
        .preferredColorScheme(.dark)
    }
}

struct ForgotPasswordView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var email = ""
    @State private var isLoading = false
    @State private var emailSent = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(red: 0.067, green: 0.094, blue: 0.153)
                    .ignoresSafeArea()
                
                VStack(spacing: 32) {
                    VStack(spacing: 16) {
                        Image(systemName: "key.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)
                        
                        Text("Reset Password")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Text("Enter your email address and we'll send you a link to reset your password.")
                            .font(.body)
                            .foregroundColor(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                    
                    if !emailSent {
                        VStack(spacing: 20) {
                            TextField("Enter your email", text: $email)
                                .textFieldStyle(CustomTextFieldStyle())
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                            
                            Button(action: sendResetEmail) {
                                HStack {
                                    if isLoading {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                            .tint(.white)
                                    } else {
                                        Image(systemName: "envelope.fill")
                                    }
                                    Text(isLoading ? "Sending..." : "Send Reset Link")
                                        .fontWeight(.semibold)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .disabled(email.isEmpty || isLoading)
                        }
                        .padding(.horizontal, 24)
                    } else {
                        VStack(spacing: 16) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.green)
                            
                            Text("Email Sent!")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            
                            Text("Check your email for a password reset link.")
                                .font(.body)
                                .foregroundColor(.white.opacity(0.7))
                                .multilineTextAlignment(.center)
                        }
                    }
                    
                    Spacer()
                }
                .padding(.top, 60)
            }
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }
                .foregroundColor(.white)
            )
        }
        .preferredColorScheme(.dark)
    }
    
    private func sendResetEmail() {
        isLoading = true
        
        // Simulate API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isLoading = false
            emailSent = true
        }
    }
}

#Preview {
    SignUpView()
} 