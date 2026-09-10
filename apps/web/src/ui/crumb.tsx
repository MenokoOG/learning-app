import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface CrumbValue {
  crumb: string;
  setCrumb: (value: string) => void;
}

const CrumbContext = createContext<CrumbValue>({ crumb: "", setCrumb: () => {} });

export function CrumbProvider({ children }: { children: ReactNode }) {
  const [crumb, setCrumb] = useState("");
  return <CrumbContext.Provider value={{ crumb, setCrumb }}>{children}</CrumbContext.Provider>;
}

export function useCrumbValue() {
  return useContext(CrumbContext).crumb;
}

/** Publishes the current page's breadcrumb tail to the top bar. */
export function usePublishCrumb(value: string | null | undefined) {
  const { setCrumb } = useContext(CrumbContext);
  useEffect(() => {
    setCrumb(value ?? "");
    return () => setCrumb("");
  }, [value, setCrumb]);
}
