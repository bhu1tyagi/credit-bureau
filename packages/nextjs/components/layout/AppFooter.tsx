import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Docs", href: "/developers" },
  { label: "GitHub", href: "https://github.com/credburo", external: true },
  { label: "Discord", href: "https://discord.gg/credburo", external: true },
];

export default function AppFooter() {
  return (
    <footer className="border-t border-[#2A2F4D] bg-[#0A0E27]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        {/* Left: Attribution */}
        <p className="text-xs text-gray-500">
          Built on{" "}
          <a
            href="https://scaffoldeth.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Scaffold-ETH 2
          </a>
        </p>

        {/* Center / Right: Links */}
        <nav className="flex items-center gap-6">
          {FOOTER_LINKS.map(link =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
