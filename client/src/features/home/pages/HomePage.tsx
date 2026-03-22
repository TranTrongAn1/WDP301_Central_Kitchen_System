import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { FeaturedDelights } from '../components/FeaturedDelights';
import { WhyChooseUs } from '../components/WhyChooseUs';
import { CustomerFeedbackSection } from '../components/CustomerFeedbackSection';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';
import { FloatingActionButton } from '../components/FloatingActionButton';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-display transition-colors duration-300">
      <Header />
      <main>
        <HeroSection />
        <FeaturedDelights />
        <WhyChooseUs />
        <CustomerFeedbackSection />
        <CTASection />
      </main>
      <Footer />
      <FloatingActionButton />
    </div>
  );
};

export default HomePage;
