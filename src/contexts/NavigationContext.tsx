import { createContext, ReactNode, useContext, useMemo } from "react";

type NavigationFn = (path: string) => void;

type NavigationContextValue = {
  navigate: NavigationFn;
  replace: NavigationFn;
};

const noopNavigation = () => {
  // Fallback for environments without a navigation provider
  // eslint-disable-next-line no-console
  console.warn("NavigationProvider not found; falling back to document navigation.");
};

const defaultNavigate: NavigationFn = (path: string) => {
  if (typeof window !== "undefined") {
    window.location.href = path;
  } else {
    noopNavigation();
  }
};

const defaultReplace: NavigationFn = (path: string) => {
  if (typeof window !== "undefined") {
    window.location.replace(path);
  } else {
    noopNavigation();
  }
};

const NavigationContext = createContext<NavigationContextValue>({
  navigate: defaultNavigate,
  replace: defaultReplace,
});

export function NavigationProvider({
  navigate,
  replace,
  children,
}: {
  navigate: NavigationFn;
  replace?: NavigationFn;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      navigate,
      replace: replace ?? defaultReplace,
    }),
    [navigate, replace],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
