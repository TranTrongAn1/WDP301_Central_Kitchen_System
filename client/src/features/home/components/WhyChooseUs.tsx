// Link import removed - not used in this component

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <div className="p-8 rounded-2xl bg-card shadow-neumorphic dark:shadow-none border border-border transition-transform hover:scale-[1.02]">
      <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center text-primary mb-6">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
};

export const WhyChooseUs = () => {
  const features = [
    {
      icon: 'nutrition',
      title: 'Artisan Ingredients',
      description:
        'We source only the finest, locally produced flour and organic ingredients to ensure every bite is pure and wholesome.',
    },
    {
      icon: 'schedule',
      title: 'Baked Hourly',
      description:
        'Freshness is our promise. Our ovens run throughout the day to bring you hot, fresh pastries whenever you visit.',
    },
    {
      icon: 'restaurant_menu',
      title: 'Master Chefs',
      description:
        'Our recipes are crafted by world-renowned pastry experts with decades of experience in the culinary arts.',
    },
  ];

  return (
    <div className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose Us
          </h2>
          <p className="text-muted-foreground">
            Experience the difference of true artisan baking with our commitment
            to excellence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
};
