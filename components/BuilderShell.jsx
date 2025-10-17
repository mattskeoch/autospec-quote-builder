"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StepHeader from "./StepHeader";
import CustomerForm from "./CustomerForm";
import ProductCard from "./ProductCard";
import { computeTotals } from "../lib/totals";

export default function BuilderShell({ data }) {
	// ---------- STATE ----------
	const steps = data?.steps ?? [];
	const items = data?.items ?? [];
	const vehicles = data?.vehicles ?? [];

	const [vehicle, setVehicle] = useState(null);
	const [stepIndex, setStepIndex] = useState(0);

	const step = steps[stepIndex] ?? { id: "", title: "", selectionMode: "single", required: false };

	// selections: { [stepId]: string[] }
	const [selections, setSelections] = useState({});

	// ---------- ENRICH (prices/weights), NO COMPATIBILITY ----------
	const allVariantIds = useMemo(
		() => Array.from(new Set(items.flatMap((i) => Object.values(i.variantIdByStore || {})))),
		[items]
	);

	const [enrich, setEnrich] = useState({ variants: {} });
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		if (!allVariantIds.length) return;
		(async () => {
			setLoading(true);
			try {
				const r = await fetch("/api/enrich", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ store: "autospec", variantIds: allVariantIds }),
				});
				const json = r.ok ? await r.json() : { variants: {} };
				if (!cancelled) setEnrich(json);
			} catch {
				if (!cancelled) setEnrich({ variants: {} });
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [allVariantIds]);

	// ---------- HELPERS ----------
	const isLastStep = stepIndex === steps.length - 1;

	function isStepComplete(s) {
		if (!s) return false;
		if (s.selectionMode === "none") return true;
		if (s.id === "vehicle_select") return !!vehicle;
		const arr = selections[s.id] ?? [];
		return arr.length > 0;
	}

	// Items belonging to the CURRENT step (no filtering for compatibility)
	const stepItems = useMemo(() => items.filter((i) => i.stepId === step.id), [items, step.id]);

	// Selected ids for the current step
	const selectedIdsForCurrent = selections[step.id] ?? [];

	// ALL selected variantIds across ALL steps (for summary)
	const allSelectedVariantIds = useMemo(() => {
		const ids = [];
		for (const [, pids] of Object.entries(selections)) {
			for (const pid of pids) {
				const item = items.find((x) => x.id === pid);
				const vid = item?.variantIdByStore?.autospec ?? item?.variantIdByStore?.linex;
				if (vid) ids.push(Number(vid));
			}
		}
		return ids;
	}, [selections, items]);

	// Build the payload items the server expects (prefer per-store IDs)
	const itemsForSubmit = useMemo(() => {
		const out = [];
		for (const [, pids] of Object.entries(selections)) {
			for (const pid of pids) {
				const it = items.find((x) => x.id === pid);
				if (!it) continue;
				const vbs = it.variantIdByStore || {};
				if (vbs.autospec || vbs.linex) {
					out.push({ variantIdByStore: vbs, quantity: 1 });
				} else {
					// fallback: if only one id is present (legacy)
					const single = vbs.autospec ?? vbs.linex;
					if (single) out.push({ variantId: Number(single), quantity: 1 });
				}
			}
		}
		return out;
	}, [selections, items]);

	const totals = useMemo(() => {
		const mapped = allSelectedVariantIds.map((variantId) => ({ variantId }));
		return computeTotals(mapped, enrich?.variants || {});
	}, [allSelectedVariantIds, enrich]);

	// ---------- ACTIONS ----------
	function toggleProduct(pid) {
		setSelections((prev) => {
			const current = new Set(prev[step.id] ?? []);
			if (current.has(pid)) current.delete(pid);
			else {
				if (step.selectionMode === "single") current.clear();
				current.add(pid);
			}
			return { ...prev, [step.id]: Array.from(current) };
		});
	}

	function goBack() {
		setStepIndex((i) => {
			const next = Math.max(0, i - 1);
			// scroll to top after step change
			if (typeof window !== "undefined") requestAnimationFrame(() => window.scrollTo(0, 0));
			return next;
		});
	}

	function goNext() {
		if (isLastStep) return; // last step handled by <CustomerForm />
		setStepIndex((i) => {
			const next = Math.min(steps.length - 1, i + 1);
			if (typeof window !== "undefined") requestAnimationFrame(() => window.scrollTo(0, 0));
			return next;
		});
	}

	// ---------- RENDER ----------
	return (
		<div className='space-y-4'>
			{/* Sticky progress header */}
			<StepHeader steps={steps} stepIndex={stepIndex} />

			{/* STEP */}
			<Card>
				<CardHeader>
					<CardTitle className='text-lg'>{step.title}</CardTitle>
				</CardHeader>
				<CardContent>
					{step.id === "vehicle_select" ? (
						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
							{vehicles.map((v) => (
								<Button
									key={v.id}
									variant={vehicle === v.id ? "default" : "outline"}
									className='w-full justify-start items-start text-left h-auto p-4 whitespace-normal break-words normal-case overflow-hidden'
									onClick={() => setVehicle(v.id)}
									aria-pressed={vehicle === v.id}
								>
									<span className='font-semibold break-words whitespace-normal'>
										{v.make} {v.model}
									</span>
								</Button>
							))}
						</div>
					) : step.id === "customer_form" ? (
						<CustomerForm
							vehicle={vehicle}
							selections={selections}
							selectedVariantIds={allSelectedVariantIds}
							itemsForSubmit={itemsForSubmit}
						/>
					) : (
						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
							{stepItems.map((it) => {
								const selected = selectedIdsForCurrent.includes(it.id);
								// Use first available variant to look up a handle from /api/enrich
								const firstVar = Object.values(it.variantIdByStore || {})[0];
								const handle = firstVar ? enrich?.variants?.[String(firstVar)]?.handle : null;
								// Default to your main storefront; Codex can later swap to per-store links.
								const productUrl = handle
									? `https://autospec4x4.com.au/products/${handle}`
									: undefined;

								return (
									<ProductCard
										key={it.id}
										name={it.name}
										selected={selected}
										productUrl={productUrl}
										onToggle={() => toggleProduct(it.id)}
									/>
								);
							})}
							{stepItems.length === 0 && (
								<div className='text-sm text-muted-foreground'>
									No options defined for this step yet.
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* NAV */}
			<div className='flex gap-2'>
				<Button variant='outline' onClick={goBack} disabled={stepIndex === 0}>
					Back
				</Button>
				{step.id !== "customer_form" && (
					<Button
						onClick={goNext}
						disabled={step.required && !isStepComplete(step)}
						title={
							step.required && !isStepComplete(step) ? "Select an option to continue" : undefined
						}
					>
						{isLastStep ? "Get Quote" : "Next"}
					</Button>
				)}
			</div>

			{/* SUMMARY BELOW (totals from ALL selections) */}
			<Card>
				<CardHeader>
					<CardTitle className='text-base'>Summary</CardTitle>
				</CardHeader>
				<CardContent className='space-y-1'>
					<div className='text-sm text-[var(--clr-muted)]'>Running Total</div>
					<div className='text-3xl font-bold'>${Number(totals.price || 0).toLocaleString()}</div>
					<div className='text-sm'>Weight: {Number(totals.weightKg || 0)} kg</div>
				</CardContent>
			</Card>
		</div>
	);
}
