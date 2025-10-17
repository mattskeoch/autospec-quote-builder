"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProductCard({ name, selected, onToggle, productUrl }) {
	return (
		<Card
			onClick={onToggle}
			role='button'
			aria-pressed={selected}
			className={[
				"cursor-pointer transition-colors",
				selected ? "border-primary bg-primary/5" : "hover:bg-muted/40",
			].join(" ")}
		>
			<CardHeader className='pb-2'>
				<CardTitle className='text-base break-words whitespace-normal'>{name}</CardTitle>
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
