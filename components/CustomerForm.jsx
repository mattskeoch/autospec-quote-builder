"use client";

import { useActionState, useEffect, useState } from "react";
import { submitQuoteAction } from "@/app/actions/submitQuote";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@/components/ui/select";

const initial = { ok: false };
const AU_STATES = ["NSW", "QLD", "VIC", "ACT", "SA", "WA", "NT"];

export default function CustomerForm({
	vehicle,
	selections,
	selectedVariantIds,
	itemsForSubmit = [],
}) {
	const [state, formAction, pending] = useActionState(submitQuoteAction, initial);

	// Local state for the shadcn Select (since it isn't a native <select>).
	const [auState, setAuState] = useState("");

	useEffect(() => {
		if (!state) return;
		if (state.ok && state.orderUrl) {
			toast.success("Quote submitted!");
			const t = setTimeout(() => {
				window.location.href = state.orderUrl;
			}, 900);
			return () => clearTimeout(t);
		}
		if (!state.ok && (state.summary || state.general)) {
			toast.error(state.summary || state.general);
		}
	}, [state]);

	const Err = ({ name }) =>
		state?.errors?.[name] ? (
			<p className='mt-1 text-xs text-red-600'>{state.errors[name]}</p>
		) : null;

	const hasItems = itemsForSubmit.length > 0;

	return (
		<form action={formAction} className='grid gap-4 sm:grid-cols-2'>
			{/* Hidden JSON payloads */}
			<input type='hidden' name='vehicleId' value={vehicle || ""} />
			<input type='hidden' name='selectionsJSON' value={JSON.stringify(selections || {})} />
			<input type='hidden' name='itemsJSON' value={JSON.stringify(itemsForSubmit)} />

			{/* First Name */}
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

			{/* Last Name */}
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

			{/* Email */}
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

			{/* Phone */}
			<div>
				<Label htmlFor='phone'>Phone</Label>
				<Input id='phone' name='phone' autoComplete='tel' aria-invalid={!!state?.errors?.phone} />
				<Err name='phone' />
			</div>

			{/* State (AU) — shadcn Select + hidden input for form POST */}
			<div>
				<Label htmlFor='state-select'>State</Label>
				<Select value={auState} onValueChange={setAuState}>
					<SelectTrigger id='state-select' aria-invalid={!!state?.errors?.state}>
						<SelectValue placeholder='Select state' />
					</SelectTrigger>
					<SelectContent>
						{AU_STATES.map((s) => (
							<SelectItem key={s} value={s}>
								{s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{/* Hidden input to actually submit the value (shadcn Select isn't a native <select>) */}
				<input type='hidden' name='state' value={auState} />
				<Err name='state' />
			</div>

			{/* Postcode */}
			<div className='sm:col-span-2'>
				<Label htmlFor='postcode'>Postcode</Label>
				<Input id='postcode' name='postcode' aria-invalid={!!state?.errors?.postcode} />
				<Err name='postcode' />
			</div>

			{/* Non-field error */}
			{state?.general && !state.ok && (
				<div className='sm:col-span-2'>
					<p className='text-sm text-red-600'>{state.general}</p>
				</div>
			)}

			<div className='sm:col-span-2'>
				<Button type='submit' disabled={pending || !hasItems || !auState} className='w-full'>
					{pending ? "Submitting…" : "Submit Quote"}
				</Button>
			</div>
		</form>
	);
}
