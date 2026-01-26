import RegisterForm from '@/features/auth/components/RegisterForm';

const SignupPage = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/20 via-background to-amber-500/10" />
      
      {/* Floating particles */}
      <div className="particle w-32 h-32 top-1/4 left-1/4 animate-float-slow z-0 bg-white/20" />
      <div className="particle w-20 h-20 bottom-1/3 right-1/4 animate-float-medium z-0 bg-white/20" />
      <div className="particle w-16 h-16 top-1/3 right-1/3 animate-float-fast z-0 bg-white/20" />
      <div
        className="particle w-24 h-24 bottom-10 left-10 animate-float-slow z-0"
        style={{ background: 'rgba(231, 126, 35, 0.15)' }}
      />

      <RegisterForm />

      {/* Footer */}
      <div className="relative z-10 mt-8 mb-4">
        <p className="text-white/60 text-xs text-center drop-shadow-md">
          © 2024 Kendo Bakery Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
