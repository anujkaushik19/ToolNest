import { Layers, AtSign, MessageCircle, Mail } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: ["PDF Tools", "Image Tools", "Document Tools", "Video & Audio", "API"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Press", "Contact"],
  },
  {
    title: "Resources",
    links: ["Help center", "Community", "Status", "Changelog"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "Cookies"],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-20 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-cyan shadow-glow">
                <Layers className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                Biz<span className="gradient-text">Nest</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm text-foreground/50">
              Every file tool you need, unified in one blazing-fast,
              privacy-first portal.
            </p>
            <div className="mt-6 flex gap-3">
              {[AtSign, MessageCircle, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl glass glass-hover"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4 text-foreground/70" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-foreground/50 transition-colors hover:text-foreground"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-foreground/40">
            © {new Date().getFullYear()} BizNest. All rights reserved.
          </p>
          <p className="text-sm text-foreground/40">
            Made with care for people who work with files.
          </p>
        </div>
      </div>
    </footer>
  );
}
