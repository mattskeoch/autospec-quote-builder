"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProductCard({ name, selected, onToggle, productUrl, image, price }) {
	return (
		<Card
			onClick={onToggle}
			role='button'
			aria-pressed={selected}
			className={[
				"cursor-pointer transition-colors overflow-hidden",
				selected ? "border-primary bg-primary/5" : "hover:bg-muted/40",
			].join(" ")}
		>
			{/* Image */}
			{image ? (
				<div className='aspect-[4/3] w-full overflow-hidden bg-muted'>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={image} alt='' className='h-full w-full object-cover' loading='lazy' />
				</div>
			) : null}

			<CardHeader className='pb-2'>
				<div className='flex items-start justify-between gap-3'>
					<CardTitle className='text-base break-words whitespace-normal'>{name}</CardTitle>
					{typeof price === "number" && price > 0 ? (
						<div className='px-2 py-0.5 rounded-md text-xs font-medium bg-muted'>
							${price.toLocaleString()}
						</div>
					) : null}
				</div>
			</CardHeader>

			<CardContent className='pt-0'>
				<div className='flex items-center gap-2'>
					{productUrl ? (
						<Button variant='link' className='px-0' onClick={(e) => e.stopPropagation()} asChild>
							<a href={productUrl} target='_blank' rel='noopener noreferrer'>
								View product ↗
							</a>
						</Button>
					) : (
						<span className='text-xs text-muted-foreground'>No product link</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
