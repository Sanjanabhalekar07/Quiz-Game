import { getAdminSession } from "../../../../lib/auth-session";
import connectToDatabase from "../../../../lib/mongoose";
import Admin from "../../../../models/Admin";
import Score from "../../../../models/Score";
import User from "../../../../models/User";

const timeZone = "Asia/Kolkata";
const dayMs = 24 * 60 * 60 * 1000;
const indiaOffsetMs = 330 * 60 * 1000;

type Range = "7d" | "30d" | "3m" | "1y";

function indiaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function utcDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export async function GET(request: Request) {
  const session = getAdminSession(request);
  if (!session) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });

  const requestedRange = new URL(request.url).searchParams.get("range") ?? "7d";
  if (!["7d", "30d", "3m", "1y"].includes(requestedRange)) {
    return Response.json({ error: "Choose a valid chart range." }, { status: 400 });
  }
  const range = requestedRange as Range;

  try {
    await connectToDatabase();
    if (!(await Admin.exists({ _id: session.userId }))) {
      return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    }

    const today = indiaDateParts(new Date());
    const daily = range !== "1y";
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const keys: string[] = [];
    let startDate: Date;
    let endDate: Date;
    let dateFormat: string;

    if (daily) {
      const todayOrdinal = Date.UTC(today.year, today.month - 1, today.day);
      const firstDate = new Date(todayOrdinal - (days - 1) * dayMs);
      startDate = new Date(firstDate.getTime() - indiaOffsetMs);
      endDate = new Date(todayOrdinal + dayMs - indiaOffsetMs);
      for (let index = 0; index < days; index += 1) {
        const date = utcDateParts(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, firstDate.getUTCDate() + index);
        keys.push(dateKey(date.year, date.month, date.day));
      }
      dateFormat = "%Y-%m-%d";
    } else {
      const firstMonth = new Date(Date.UTC(today.year, today.month - 12, 1));
      const nextMonth = new Date(Date.UTC(today.year, today.month, 1));
      startDate = new Date(firstMonth.getTime() - indiaOffsetMs);
      endDate = new Date(nextMonth.getTime() - indiaOffsetMs);
      for (let index = 0; index < 12; index += 1) {
        const month = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
        keys.push(`${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`);
      }
      dateFormat = "%Y-%m";
    }

    const [users, games] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: timeZone } }, count: { $sum: 1 } } },
      ]),
      Score.aggregate([
        { $match: { playedAt: { $gte: startDate.getTime(), $lt: endDate.getTime() } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: { $toDate: "$playedAt" }, timezone: timeZone } }, count: { $sum: 1 } } },
      ]),
    ]);
    const userCounts = new Map(users.map((item: { _id: string; count: number }) => [item._id, item.count]));
    const gameCounts = new Map(games.map((item: { _id: string; count: number }) => [item._id, item.count]));

    return Response.json({
      range,
      granularity: daily ? "day" : "month",
      points: keys.map((key) => ({ key, users: userCounts.get(key) ?? 0, games: gameCounts.get(key) ?? 0 })),
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Could not load admin analytics:", error);
    return Response.json({ error: "Could not load dashboard analytics." }, { status: 500 });
  }
}
