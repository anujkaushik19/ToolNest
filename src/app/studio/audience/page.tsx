import { getStudioData } from "@/lib/studio";
import { bestTimes } from "@/lib/studio/metrics";
import { Card, CardHead, PageHeader, compact } from "@/components/studio/ui";
import { Donut } from "@/components/studio/Charts";

const GENDER_COLORS = ["#6366f1", "#e879f9", "#94a3b8"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AudiencePage() {
  const data = await getStudioData();
  const demo = data.demographics;
  const gender = demo.gender.map((g, i) => ({ ...g, color: GENDER_COLORS[i % GENDER_COLORS.length] }));
  const maxAge = Math.max(...demo.age.map((a) => a.value));

  const { blocks, grid } = bestTimes(data.media);
  const maxReach = Math.max(...grid.map((g) => g.reach), 1);
  const cell = (wd: number, block: string) => grid.find((g) => g.weekday === wd && g.block === block);
  const bestCell = grid.reduce((a, b) => (b.reach > a.reach ? b : a), grid[0]);

  return (
    <div>
      <PageHeader
        title="Audience & Timing"
        subtitle="Who you reach and when they're most receptive — post to match."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHead title="Gender" subtitle="Share of audience" />
          <div className="px-4 pb-4 pt-2">
            <Donut data={gender} />
            <div className="mt-2 space-y-1">
              {gender.map((g) => (
                <div key={g.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.label}
                  </span>
                  <span className="font-semibold text-slate-900">{g.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHead title="Age" subtitle="Distribution of followers" />
          <div className="space-y-3 px-5 pb-5 pt-4">
            {demo.age.map((a) => (
              <div key={a.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{a.label}</span>
                  <span className="text-slate-500">{a.value}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                    style={{ width: `${(a.value / maxAge) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHead title="Top cities" />
          <ul className="px-5 pb-5 pt-3">
            {demo.cities.map((c, i) => (
              <li key={c.label} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm last:border-0">
                <span className="text-slate-700">
                  <span className="mr-2 text-slate-400">{i + 1}</span>
                  {c.label}
                </span>
                <span className="font-semibold text-slate-900">{c.value}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHead title="Top countries" />
          <ul className="px-5 pb-5 pt-3">
            {demo.countries.map((c, i) => (
              <li key={c.label} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm last:border-0">
                <span className="text-slate-700">
                  <span className="mr-2 text-slate-400">{i + 1}</span>
                  {c.label}
                </span>
                <span className="font-semibold text-slate-900">{c.value}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHead
          title="Best time to post"
          subtitle={
            bestCell
              ? `Your reach peaks on ${WEEKDAYS[bestCell.weekday]}, ${bestCell.block.replace("-", "–")}h`
              : "Reach by day and time"
          }
        />
        <div className="overflow-x-auto px-5 pb-5 pt-4">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th />
                {blocks.map((b) => (
                  <th key={b} className="pb-1 text-center text-[11px] font-medium text-slate-500">
                    {b}h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((wd, wi) => (
                <tr key={wd}>
                  <td className="pr-2 text-right text-xs font-medium text-slate-500">{wd}</td>
                  {blocks.map((b) => {
                    const c = cell(wi, b);
                    const intensity = c ? c.reach / maxReach : 0;
                    return (
                      <td key={b} className="p-0">
                        <div
                          className="flex h-9 items-center justify-center rounded-md text-[10px] font-semibold"
                          style={{
                            backgroundColor: `rgba(99,102,241,${0.08 + intensity * 0.85})`,
                            color: intensity > 0.5 ? "white" : "#475569",
                          }}
                          title={c ? `${compact(c.reach)} reach · ${c.posts} posts` : "No posts"}
                        >
                          {c && c.reach > 0 ? compact(c.reach) : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-400">Darker = more reach. Based on when your posts historically landed best.</p>
        </div>
      </Card>
    </div>
  );
}
