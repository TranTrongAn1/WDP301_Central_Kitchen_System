export const HeroSection = () => {
  return (
    <div className="relative w-full overflow-hidden bg-background">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[80px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="flex flex-col items-start text-left space-y-8">
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight">
              <span className="text-foreground">Freshly Baked</span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500">
                Happiness.
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed font-light">
              Experience the art of premium baking with Kendo. Where traditional
              craftsmanship meets modern taste, delivered fresh to your hands
              every single day.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button className="flex items-center gap-2 h-14 px-8 rounded-full bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-300">
                <span>Order Now</span>
                <span className="material-symbols-outlined text-[20px]">
                  arrow_forward
                </span>
              </button>
              <button className="flex items-center gap-2 h-14 px-8 rounded-full bg-secondary text-foreground font-semibold text-base border border-border hover:bg-secondary/80 transition-all duration-300">
                <span className="material-symbols-outlined text-[20px] text-muted-foreground">
                  play_circle
                </span>
                <span>Watch Video</span>
              </button>
            </div>
          </div>

          <div className="relative h-[400px] lg:h-[600px] w-full flex items-center justify-center">
            <div className="relative z-20 w-[300px] h-[300px] lg:w-[450px] lg:h-[450px] rounded-full bg-gradient-to-b from-orange-100 to-white dark:from-secondary dark:to-card shadow-2xl flex items-center justify-center border-[8px] border-white/30 dark:border-white/5 backdrop-blur-sm">
              <div
                className="w-[90%] h-[90%] rounded-full overflow-hidden bg-cover bg-center shadow-inner"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCVEfbd-8WdW5CEWEItCIxX8apy4SVy0rc0-fBtwNDFIv_7TKHt_v4_hzQTzMoYV5Hg-r_gsPnGr0BUZx3IVf0v_oYY-apyyGkdYdJ0KTMBI7Ov8eH3LnPhfy5k3CUB88cRMGTLQpTO8a0Pyp6L2b1JpU4ayqYRi2U8403kbeCe4P5Wg1L2c2as94j8lKup4JnxELsQUe7OCuszz3RUVqmtnEUDSwMGEGk7MjH5p_x7hwkeaESiLowgFHPY0lA5bBjVuPCGTZVt3cM")',
                }}
              />
            </div>

            <div
              className="absolute top-[10%] left-0 lg:left-[5%] z-30 p-4 bg-card/80 backdrop-blur-xl rounded-2xl shadow-float border border-border"
              style={{ animationDuration: '3s' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-lg bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDL5z35itNY_DPn1_OjzIl8Gqciw96b-tCYsviaaize2xfvH1u1U_HeXlhB6BaSufLEX6KvUgacW14Qqt81kRpSMwJBzUr1EoALDYtW9hYS2rPYPutIRydadtMU5xw9IJMJV46D6mOwgyo9KBQtawo850qTxn1H_cxwtgEO0WW6M_LlOTBNKt58sq1FulDOc5w3SGAsLHcPLPtnaK-RoZLIDz-qHDoVyhTm6ft44kNbKjrswr758Tjw9JZYE9oNrYi76pylUhEwO-M")',
                  }}
                />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Bestseller
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    Golden Croissant
                  </p>
                </div>
                <span className="ml-2 text-primary font-bold text-sm">
                  $4.50
                </span>
              </div>
            </div>

            <div
              className="absolute bottom-[15%] right-0 lg:right-[5%] z-30 p-4 bg-card/80 backdrop-blur-xl rounded-2xl shadow-float border border-border"
              style={{ animationDuration: '4s', animationDelay: '1s' }}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600">
                  <span className="material-symbols-outlined text-xl">eco</span>
                </span>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Ingredients
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    100% Organic
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
