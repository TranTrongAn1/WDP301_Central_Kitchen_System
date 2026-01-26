import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { FeaturedDelights } from '../components/FeaturedDelights';
import { WhyChooseUs } from '../components/WhyChooseUs';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';
import { FloatingActionButton } from '../components/FloatingActionButton';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main dark:text-gray-200 font-display transition-colors duration-300">
      <Header />
      <main>
        <HeroSection />
        <FeaturedDelights />
        <WhyChooseUs />
        <CTASection />
      </main>
      <Footer />
      <FloatingActionButton />
    </div>
  );
};

export default HomePage;
