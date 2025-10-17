"use client";

import { useActionState, useEffect } from "react";
import { submitQuoteAction } from "@/app/actions/submitQuote";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const initial = { ok: false };

export default function CustomerForm({ vehicle, selections, selectedVariantIds }) {
	const [state, formAction, pending] = useActionState(submitQuoteAction, initial);

	useEffect(() => {
		if (!state) return;
		if (state.ok && state.orderUrl) {
			toast.success("Quote submitted!");
			const t = setTimeout(() => {
				window.location.href = state.orderUrl;
			}, 900);
			return () => clearTimeout(t);
		}
		if (!state.ok && state.general) toast.error(state.general);
	}, [state]);

	const Err = ({ name }) =>
		state?.errors?.[name] ? (
			<p className='mt-1 text-xs text-red-600'>{state.errors[name]}</p>
		) : null;

	return (
		<form action={formAction} className='grid gap-4 sm:grid-cols-2'>
			{/* Hidden JSON payloads */}
			<input type='hidden' name='vehicleId' value={vehicle || ""} />
			<input type='hidden' name='selectionsJSON' value={JSON.stringify(selections || {})} />
			<input
				type='hidden'
				name='itemsJSON'
				value={JSON.stringify((selectedVariantIds || []).map((v) => ({ variantId: v })))}
			/>

			<div>
				<Label htmlFor='firstName'>First name</Label>
				<Input
					id='firstName'
					name='firstName'
					autoComplete='given-name'
					aria-invalid={!!state?.errors?.firstName}
				/>
				<Err name='firstName' />
			</div>

			<div>
				<Label htmlFor='lastName'>Last name</Label>
				<Input
					id='lastName'
					name='lastName'
					autoComplete='family-name'
					aria-invalid={!!state?.errors?.lastName}
				/>
				<Err name='lastName' />
			</div>

			<div className='sm:col-span-2'>
				<Label htmlFor='email'>Email</Label>
				<Input
					id='email'
					name='email'
					type='email'
					autoComplete='email'
					aria-invalid={!!state?.errors?.email}
				/>
				<Err name='email' />
			</div>

			<div>
				<Label htmlFor='phone'>Phone</Label>
				<Input id='phone' name='phone' autoComplete='tel' aria-invalid={!!state?.errors?.phone} />
				<Err name='phone' />
			</div>

			<div>
				<Label htmlFor='state'>State</Label>
				<Input
					id='state'
					name='state'
					placeholder='e.g. WA'
					aria-invalid={!!state?.errors?.state}
				/>
				<Err name='state' />
			</div>

			<div className='sm:col-span-2'>
				<Label htmlFor='postcode'>Postcode</Label>
				<Input id='postcode' name='postcode' aria-invalid={!!state?.errors?.postcode} />
				<Err name='postcode' />
			</div>

			{/* Items error (e.g., none selected) */}
			{state?.errors?.items && (
				<div className='sm:col-span-2'>
					<p className='text-sm text-red-600'>{state.errors.items}</p>
				</div>
			)}

			{/* General (non-field) error */}
			{state?.general && !state.ok && (
				<div className='sm:col-span-2'>
					<p className='text-sm text-red-600'>{state.general}</p>
				</div>
			)}

			<div className='sm:col-span-2'>
				<Button type='submit' disabled={pending} className='w-full'>
					{pending ? "Submitting…" : "Submit Quote"}
				</Button>
			</div>
		</form>
	);
}
