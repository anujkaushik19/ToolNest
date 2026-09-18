export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base */}
      <div className="absolute inset-0 bg-[#05060f]" />
      {/* aurora blobs */}
      <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] animate-aurora rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="absolute right-[-10rem] top-20 h-[32rem] w-[32rem] animate-aurora rounded-full bg-accent-cyan/20 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[34rem] w-[34rem] animate-aurora rounded-full bg-accent-fuchsia/20 blur-[130px] [animation-delay:-12s]" />
      {/* grid overlay */}
      <div className="absolute inset-0 grid-pattern opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05060f]" />
    </div>
  );
}
