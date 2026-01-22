import { Link } from 'react-router-dom';

export const CTASection = () => {
  return (
    <div className="relative py-20 px-4">
      <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden relative shadow-2xl">
        {}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAoto-1H_ZZz6Wgfy0owZQwfLyf94deaWkJaPB9_ySCOkB0zL21IEmg_JimnwXe3K664qBj-moE3RxwjzbmGvCst-yTaDfmPafQsgF0lRScfZfl4VY-MwxuftGySxFN4tx6aUUkZJBMtFP4tXKgVQ0kBYEuPzOQhyf01G0ZFvlXrUSFm_R0TnXGwaYZzrgqLbw02PdHo1h32t7Y9JDPTUhn1y_eBqKJapqXhW0-iTlRxg3IIg5Gnp7qMBEqAJtdeghY97DfyvLPZEg")',
          }}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <div className="relative z-10 px-6 py-16 md:px-12 md:py-20 text-center text-white">
          <span className="material-symbols-outlined text-4xl mb-6 text-primary animate-bounce">
            local_cafe
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Ready to taste the magic?
          </h2>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            Join thousands of happy customers enjoying the freshest bakes in
            town. Pre-order online and skip the queue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="h-12 px-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors duration-200">
              View Full Menu
            </button>
            <button className="h-12 px-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold backdrop-blur-md transition-colors duration-200">
              Find a Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
