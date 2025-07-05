export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full bg-white/5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl shadow-2xl">
                <span className="text-3xl lg:text-4xl">🎭</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs">💬</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Get in Touch
          </h1>
          <p className="text-purple-200 text-lg lg:text-xl max-w-2xl mx-auto">
            We'd love to hear from you! Whether you're a venue, customer, or have questions about Last Minute Live.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info */}
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 lg:p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              📧 Contact Information
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl">✉️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Email</h3>
                  <p className="text-purple-200">hello@lastminutelive.com</p>
                  <p className="text-purple-300 text-sm">We typically respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl">🎪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">For Venues</h3>
                  <p className="text-purple-200">venues@lastminutelive.com</p>
                  <p className="text-purple-300 text-sm">Partnership and venue onboarding</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl">🎫</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Customer Support</h3>
                  <p className="text-purple-200">support@lastminutelive.com</p>
                  <p className="text-purple-300 text-sm">Ticket issues and general help</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl">💡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Business Hours</h3>
                  <p className="text-purple-200">Monday - Friday: 9 AM - 6 PM GMT</p>
                  <p className="text-purple-300 text-sm">Weekend support available via email</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 lg:p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              💌 Send us a Message
            </h2>
            
            <form className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent backdrop-blur-sm"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent backdrop-blur-sm"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Subject
                </label>
                <select className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent backdrop-blur-sm">
                  <option value="">Choose a topic</option>
                  <option value="customer">Customer Support</option>
                  <option value="venue">Venue Partnership</option>
                  <option value="technical">Technical Issue</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Message
                </label>
                <textarea
                  rows={5}
                  required
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent backdrop-blur-sm resize-none"
                  placeholder="Tell us how we can help you..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white font-bold py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                <span className="mr-2">🚀</span>
                Send Message
              </button>
            </form>

            <p className="text-purple-300 text-sm mt-4 text-center">
              We'll get back to you as soon as possible!
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-12">
          <a 
            href="/"
            className="inline-flex items-center text-purple-300 hover:text-white transition-colors font-medium"
          >
            <span className="mr-2">←</span>
            Back to Shows
          </a>
        </div>
      </div>
    </div>
  )
} 