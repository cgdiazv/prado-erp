import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Prado Jobs | Streamlined Operations & Job Management",
    template: "%s | Prado Jobs",
  },
  description: "Prado Jobs helps field service businesses quote, schedule, and invoice jobs from the field — in seconds, not spreadsheets.",
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
