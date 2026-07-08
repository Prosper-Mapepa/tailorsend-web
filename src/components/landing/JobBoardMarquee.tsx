const BOARDS = [
  "Greenhouse",
  "Lever",
  "RemoteOK",
  "We Work Remotely",
  "LinkedIn",
  "Indeed",
  "Stripe",
  "Notion",
  "Figma",
  "Dropbox",
];

export function JobBoardMarquee() {
  const items = [...BOARDS, ...BOARDS];

  return (
    <div className="landing-marquee-mask relative overflow-hidden border-y border-slate-200/60 bg-white py-5">
      <div className="landing-marquee flex w-max gap-10">
        {items.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="shrink-0 text-sm font-medium tracking-wide text-slate-400"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
