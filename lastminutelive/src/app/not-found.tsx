export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full bg-white/5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 lg:py-12 flex items-center min-h-screen">
        <div className="text-center w-full">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl shadow-2xl">
                <span className="text-3xl lg:text-4xl">🎭</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs">😕</span>
              </div>
            </div>
          </div>

          {/* 404 Content */}
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-8 lg:p-12 border border-white/20 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-6xl lg:text-8xl font-bold text-white mb-4 opacity-80">
                404
              </h1>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                Show Not Found
              </h2>
              <p className="text-purple-200 text-lg lg:text-xl mb-6 leading-relaxed">
                Oops! The page you're looking for has left the building.<br />
                Maybe it was a last-minute cancellation?
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <a 
                href="/"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                <span className="mr-3 text-xl group-hover:animate-bounce">🎪</span>
                Back to Shows
              </a>
              
              <a 
                href="/contact"
                className="inline-flex items-center px-8 py-4 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-lg backdrop-blur-sm border border-white/30 hover:border-white/50 transition-all duration-200"
              >
                <span className="mr-3">📧</span>
                Contact Us
              </a>
            </div>

            {/* Additional links */}
            <div className="pt-6 border-t border-white/20">
              <p className="text-purple-300 text-sm mb-4">
                Looking for something specific?
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <a 
                  href="/venue" 
                  className="text-purple-300 hover:text-white transition-colors font-medium"
                >
                  🎭 Venue Dashboard
                </a>
                <span className="text-purple-500">•</span>
                <a 
                  href="/" 
                  className="text-purple-300 hover:text-white transition-colors font-medium"
                >
                  🎫 Available Shows
                </a>
                <span className="text-purple-500">•</span>
                <a 
                  href="/contact" 
                  className="text-purple-300 hover:text-white transition-colors font-medium"
                >
                  💬 Get Help
                </a>
              </div>
            </div>
          </div>

          {/* Fun message */}
          <div className="mt-8 text-center">
            <p className="text-purple-400 text-sm">
              Don't worry, the show must go on! 🎵
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 