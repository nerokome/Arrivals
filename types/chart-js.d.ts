declare module "chart.js" {
	export const Chart: {
		register: (...items: unknown[]) => void;
	};
	export const ArcElement: unknown;
	export const Tooltip: unknown;
	export const Legend: unknown;
}
