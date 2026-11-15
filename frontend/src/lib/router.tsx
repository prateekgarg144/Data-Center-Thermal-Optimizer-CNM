import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

type Route = '/' | '/lab' | '/compare' | '/theory';

interface RouterContextType {
  route: Route;
  navigate: (to: Route) => void;
}

const RouterContext = createContext<RouterContextType>({
  route: '/',
  navigate: () => {},
});

function getCleanRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === '/lab' || hash === '/compare' || hash === '/theory') {
    return hash;
  }
  return '/';
}

export const HashRouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<Route>(getCleanRoute());

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getCleanRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (to: Route) => {
    window.location.hash = to === '/' ? '#/' : `#${to}`;
  };

  const value = useMemo(() => ({ route, navigate }), [route]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export function useRouter() {
  return useContext(RouterContext);
}
