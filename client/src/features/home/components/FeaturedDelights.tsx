import { useRef } from 'react';

interface ProductCardProps {
  title: string;
  description: string;
  price: string;
  unit: string;
  imageUrl: string;
  badge?: string;
}

const ProductCard = ({
  title,
  description,
  price,
  unit,
  imageUrl,
  badge,
}: ProductCardProps) => {
  return (
    <div className="min-w-[280px] md:min-w-[320px] snap-center group">
      <div className="relative h-[420px] w-full transition-transform duration-500 group-hover:-translate-y-2">
        <div className="absolute inset-0 bg-card rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col">
          <div
            className="h-[60%] w-full bg-cover bg-center relative"
            style={{ backgroundImage: `url("${imageUrl}")` }}
          >
            {badge && (
              <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                {badge}
              </div>
            )}
          </div>
          <div className="p-6 flex flex-col flex-1 justify-between bg-gradient-to-b from-white to-orange-50/30 dark:from-card dark:to-card/50">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-lg font-bold text-foreground">
                {price}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {unit}
                </span>
              </span>
              <button className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const products = [
  {
    title: 'Moon Cakes',
    description:
      'Traditional lotus paste with salted egg yolk, baked to golden perfection.',
    price: '$12.00',
    unit: 'box',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA64x1QgLPfrF-FZ1enOM_22ri8nOU3L35il4ddoeVS51mAxO-NadQiEd0AwXxJWvA_I6q5qjvm4IzLclalPzyDRs9jzWv52FBWiPsf59jAEQjQTaAg3fcJ68t1KgcW6-K4mfGoH39qsEQGCGxjPxdXlzbas3KJHJONoH87cqf7iZUX6RRGEZOdVub7KMl8R9WgVDZDWwQqfgx21Dg8YccHjVtRuIRHJONvIlTC20L-DbZgL3ArXYTuEowEunOJH72b_3WwrVg_G4w',
    badge: 'SEASONAL',
  },
  {
    title: 'Su Kem (Cream Puffs)',
    description:
      'Delicate choux pastry filled with rich vanilla custard cream.',
    price: '$4.50',
    unit: 'pc',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBIXyFaAx9hXkL9sa8XrfmUoFAwTtdU3EX0lLKF8poVseko5gknDW7HfOfPzHHWVoRBnrdTwSu5l24fd0SyMt2wcpwWQYAQYYQfpkzKylwtrAyHo9RxWiCcu8B5fJSrpdUnTEs6nxQxcToWy0Wj9rFMNaW_XF2bIAghz0mQ80m9a_i3ItMNwQs1E6Qa2IHicf0eTuV-uBWKaq64KKg5QxvEqmpnuXP6gY-AygQ2uSlEmjeAexHG_XM0gz8rRiOV2JvS1wR7rlc2tBw',
  },
  {
    title: 'Artisan Baguette',
    description:
      'Classic French recipe with a crispy crust and soft, airy crumb.',
    price: '$3.00',
    unit: 'pc',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBLLJXvy1nHJP_g2rerKSSeuszZVsmcIL1LMBKT47jdN0DYKFfyZtgyMBeQabqiU4vFBMn2H2T8njnGnbqePG2qy1oKrbCduoAaJkeynve85BRYC5XjR6nufLILJz7KZF0CRS72jrngFVC5gg4UXgW9_dGm9PL3Fnr2HG-ZRImgbykGWOyFtMG0F8AE52XqRvM0F6s7hp94nnLkjrEGoccugFsRwrq4xGRPB9Eeus4PoO5X2gEx56aRr0GfN6XtjBfBCnhHiECUDfI',
  },
  {
    title: 'Macaron Set',
    description:
      'Assorted flavors including pistachio, raspberry, and chocolate.',
    price: '$15.00',
    unit: 'set',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBr6gGex6sHTiIlVYVfkcYwpIE3i8hpo5u8VONdNqr1vfv7WzfdwSYmdgOJfN7vH-kuJ2sWEHrWcXovn8UtcYeM4gCAWMAlw7agEWdxUpSTSl-aaf6JlSWxfaYsle1zv-ntG8pRqZTDa8To9TRV14ZcBCIWfUVp4cOpT7BjoJxfeZkjG9iIzW5w1s3cpmYk5WP3p5WXqUR_VnzMLZa9jlHgSiKmc-OooVySzsofZPUW7FfxQRM2EqZzdWX4KP_luIZRyCpwzVN5sNo',
  },
];

export const FeaturedDelights = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <div className="py-24 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Featured Delights
            </h2>
            <p className="text-muted-foreground text-lg">
              Curated selection of our daily finest.
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-3 rounded-full border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-lg"
            aria-label="Scroll left"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto hide-scrollbar pb-10 snap-x px-4"
          >
            {products.map((product, index) => (
              <ProductCard key={index} {...product} />
            ))}
          </div>

          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/40"
            aria-label="Scroll right"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
