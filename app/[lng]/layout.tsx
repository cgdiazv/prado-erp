import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Prado | Streamlined Operations & Job Management",
    template: "%s | Prado",
  },
  description: "The all-in-one workspace built for modern service and landscaping professionals. Schedule jobs, manage team workflows, track customers, and simplify billing seamlessly.",
};

export default function LngLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}>) {
  void params;
  return (
    <>
      {children}
    </>
  );
}
