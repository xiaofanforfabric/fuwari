/**
 * 主页「我的作品」区块的数据源。
 * 想增删作品，直接改这个数组即可（或删掉整项）。
 *
 * 字段说明：
 *   name    显示名（必填）
 *   desc    一句话简介
 *   repo    GitHub 仓库 "owner/name"（可选；填了会自动带出 GitHub 链接和 Star 数）
 *   url     自定义链接（可选；用于官网等非 GitHub 项目，优先级高于 repo）
 *   lang    主要语言（显示语言色点）
 *   stars   Star 数（手动填，避免每次加载都请求 GitHub API）
 *   tags    额外标签
 *   note    角标提示（如"源码未开源"），可选
 */
export interface Work {
	name: string;
	desc: string;
	repo?: string;
	url?: string;
	lang?: string;
	stars?: number;
	tags?: string[];
	note?: string;
}

/** GitHub 语言对应的颜色（用于语言色点） */
export const langColors: Record<string, string> = {
	Java: "#b07219",
	Go: "#00ADD8",
	JavaScript: "#f1e05a",
	TypeScript: "#3178c6",
	Kotlin: "#A97BFF",
	HTML: "#e34c26",
	Shell: "#89e051",
	C: "#555555",
	Python: "#3572A5",
};

export const works: Work[] = [
	{
		name: "FanVerify",
		desc: "用微信小程序动态验证码替代密码登录的 2FA 鉴权平台，可为个人博客、论坛、Minecraft 服务器提供开箱即用的 OpenAPI 接入。",
		repo: "xiaofanforfabric/FanVerify",
		url: "https://www.fanverify.cn/",
		lang: "Go",
		tags: ["微信小程序", "OpenAPI", "Minecraft"],
		note: "源码 2026-10-10 开源",
	},
	{
		name: "AntiHackerX",
		desc: "JVM 通用外壳项目，保护你的知识产权不被侵犯。",
		repo: "H3K4-top/AntiHackerX",
		lang: "Java",
		stars: 0,
		tags: ["H3K4", "安全"],
	},
	{
		name: "Fan-ME-FRP-Launcher",
		desc: "使用 Java 开发的 FRPC 启动器，为 ME-FRP 内网穿透而生。",
		repo: "xiaofanforfabric/Fan-ME-FRP-Launcher",
		lang: "Java",
		stars: 5,
		tags: ["ME-FRP", "内网穿透"],
	},
];
