/**
 * 离线生成贡献蛇动画 —— fetch 拦截器
 *
 * 背景：snk 官方 CLI 内部会 POST https://api.github.com/graphql 读取贡献数据，
 * 这一步强制要求 GitHub Token。但贡献格子本身是公开可见的，
 * 所以这里拦截该请求，用公开页面上的数据构造出等价的 GraphQL 响应，
 * 从而做到「无需 Token、可离线生成」。
 *
 * 注意：这里是「抓取当下快照」，不会自动更新。
 * 想让它每天跟着贡献自动变，请用 .github/workflows/snake.yml。
 *
 * 用法（在仓库根目录）：
 *   npm i -D generate-snake-animation@3 canvas@3.2.0 gif-encoder-2@1.0.5 gifsicle@5.3.0
 *   node --import ./scripts/snake-mock-fetch.mjs \
 *     ./node_modules/generate-snake-animation/cli.js \
 *     --github_user=xiaofanforfabric --github_token=mock \
 *     --output=public/snake/snake.svg \
 *     --output='public/snake/snake-dark.svg?palette=github-dark' \
 *     --output='public/snake/snake.gif?color_background=#ffffff'
 *
 * 可用环境变量：
 *   SNAKE_USER  用户名（默认 xiaofanforfabric）
 *   SNAKE_HTML  已有的贡献页 HTML 缓存路径（可选，省一次网络请求）
 */
import fs from "node:fs";

const USER = process.env.SNAKE_USER || "xiaofanforfabric";
const HTML_PATH = process.env.SNAKE_HTML || "";

const LEVELS = [
	"NONE",
	"FIRST_QUARTILE",
	"SECOND_QUARTILE",
	"THIRD_QUARTILE",
	"FOURTH_QUARTILE",
];

async function loadHtml() {
	if (HTML_PATH) {
		try {
			return fs.readFileSync(HTML_PATH, "utf8");
		} catch {
			/* 读不到就回退到联网抓取 */
		}
	}
	const url = `https://github.com/users/${USER}/contributions`;
	console.error(`[snake] 抓取公开贡献页：${url}`);
	const res = await fetch(url, {
		headers: { "User-Agent": "Mozilla/5.0 (snake-offline-generator)" },
	});
	if (!res.ok) throw new Error(`抓取贡献页失败：HTTP ${res.status}`);
	return res.text();
}

async function buildGraphQLResponse() {
	const html = await loadHtml();

	// 解析每个格子：data-date="YYYY-MM-DD" ... data-level="0..4"
	const levelByDate = new Map();
	const cellRe = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"/g;
	let m;
	while ((m = cellRe.exec(html)) !== null) {
		levelByDate.set(m[1], Number(m[2]));
	}
	if (levelByDate.size === 0) {
		throw new Error("没解析到任何贡献格子，GitHub 页面结构可能变了");
	}

	// 顺带把真实贡献次数从 tooltip 里抠出来（形如 "3 contributions on ..."）
	const idToDate = new Map();
	const idRe =
		/data-date="(\d{4}-\d{2}-\d{2})"[^>]*?id="(contribution-day-component-[^"]+)"/g;
	while ((m = idRe.exec(html)) !== null) idToDate.set(m[2], m[1]);

	const countByDate = new Map();
	const tipRe = /<tool-tip[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g;
	while ((m = tipRe.exec(html)) !== null) {
		const date = idToDate.get(m[1]);
		if (!date) continue;
		const text = m[2].replace(/<[^>]+>/g, "").trim();
		const num = text.match(/^([\d,]+)\s+contribution/i);
		countByDate.set(date, num ? Number(num[1].replace(/,/g, "")) : 0);
	}

	const dates = [...levelByDate.keys()].sort();

	// 以第一格所在周的周日为起点，铺成 GitHub 那种「周 × 7 天」网格
	const first = new Date(`${dates[0]}T00:00:00Z`);
	const firstSunday = new Date(first);
	firstSunday.setUTCDate(first.getUTCDate() - first.getUTCDay());
	const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
	const weeksCount = Math.floor((last - firstSunday) / (7 * 86400000)) + 1;

	const weeks = [];
	for (let w = 0; w < weeksCount; w++) {
		const contributionDays = [];
		for (let d = 0; d < 7; d++) {
			const dt = new Date(firstSunday);
			dt.setUTCDate(firstSunday.getUTCDate() + w * 7 + d);
			const iso = dt.toISOString().slice(0, 10);
			const level = levelByDate.get(iso) ?? 0;
			contributionDays.push({
				contributionCount: countByDate.get(iso) ?? level,
				contributionLevel: LEVELS[level],
				weekday: d,
				date: iso,
			});
		}
		weeks.push({ contributionDays });
	}

	const total = [...countByDate.values()].reduce((a, b) => a + b, 0);
	console.error(
		`[snake] 解析到 ${levelByDate.size} 天 / ${weeksCount} 周，累计 ${total} 次贡献`,
	);

	return {
		data: {
			user: {
				contributionsCollection: {
					contributionCalendar: { weeks },
				},
			},
		},
	};
}

const responseBody = await buildGraphQLResponse();

// 拦截：把发往 GitHub GraphQL 的请求换成我们本地构造的数据
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	const url = typeof input === "string" ? input : (input?.url ?? "");
	if (url.includes("api.github.com/graphql")) {
		console.error("[snake] 已拦截 GraphQL 请求，改用本地数据（无需 Token）");
		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}
	return realFetch(input, init);
};
