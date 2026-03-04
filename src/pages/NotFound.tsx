import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold font-heading text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground font-body">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-[#1a6fe0] font-body">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
