export default function ConvertedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="ondu-surface-solid p-6 sm:p-8 md:p-10 lg:p-12">
      {children}
    </section>
  );
}
