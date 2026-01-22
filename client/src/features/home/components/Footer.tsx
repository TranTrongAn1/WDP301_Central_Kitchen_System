import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-background border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-2xl">
                bakery_dining
              </span>
              <h3 className="text-lg font-bold text-foreground">
                Kendo<span className="text-primary">Bakery</span>
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Baking happiness since 2010. We bring the warmth of the oven
              directly to your heart.
            </p>
          </div>

          {}
          <div>
            <h4 className="font-bold text-foreground mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  to="#"
                  className="hover:text-primary transition-colors"
                >
                  Menu
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="hover:text-primary transition-colors"
                >
                  Locations
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="hover:text-primary transition-colors"
                >
                  Catering
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="hover:text-primary transition-colors"
                >
                  Gift Cards
                </Link>
              </li>
            </ul>
          </div>

          {}
          <div>
            <h4 className="font-bold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  to="#"
                  className="hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="hover:text-primary transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="hover:text-primary transition-colors"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {}
          <div>
            <h4 className="font-bold text-foreground mb-4">Stay Connected</h4>
            <div className="flex gap-4 mb-4">
              <a
                href="#"
                className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <svg
                  aria-hidden="true"
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    clipRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    fillRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="#"
                className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <svg
                  aria-hidden="true"
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    clipRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465C9.673 2.013 10.03 2 12.48 2h-.165zm-3.77 1.795c-.95.045-1.583.25-1.929.386-.369.145-.63.307-.86.537-.229.23-.393.492-.54.86-.134.346-.34.979-.383 1.929-.046 1.041-.06 1.353-.06 4.088 0 2.734.014 3.047.06 4.086.045.95.25 1.583.385 1.929.146.369.308.63.538.86.23.23.492.393.86.54.346.134.979.34 1.929.383 1.041.046 1.353.06 4.088.06 2.734 0 3.047-.014 4.086-.06.95-.045 1.583-.25 1.929-.385.369-.146.63-.308.86-.538.23-.23.393-.492.54-.86.134-.346.34-.979.383-1.929.046-1.041.06-1.353.06-4.088 0-2.734-.014-3.047-.06-4.086-.045-.95-.25-1.583-.385-1.929-.146-.369-.308-.63-.538-.86-.23-.23-.492-.393-.86-.54-.346-.134-.979-.34-1.929-.383-1.042-.045-1.353-.06-4.087-.06-2.734 0-3.047.014-4.086.06h.2zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    fillRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © 2024 Kendo Bakery Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="#"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="#"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
            <Link
              to="#"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
