"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";

export interface FeatureTabItem {
  value: string;
  label: string;
}

export function FeatureTabs({
  tabs,
  defaultValue,
  children,
}: {
  tabs: FeatureTabItem[];
  defaultValue: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    const readTab = () => {
      const requested = new URLSearchParams(window.location.search).get("tab");
      if (requested && tabs.some((tab) => tab.value === requested)) {
        setValue(requested);
      }
    };

    readTab();
    window.addEventListener("popstate", readTab);
    return () => window.removeEventListener("popstate", readTab);
  }, [tabs]);

  function onChange(nextValue: string) {
    setValue(nextValue);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", nextValue);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs value={value} onValueChange={onChange} className="grid gap-4">
      <TabsList className="max-w-full overflow-x-auto">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

export { TabsContent };
