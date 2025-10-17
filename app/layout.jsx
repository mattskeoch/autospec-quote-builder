export const metadata = { title: "Autospec Quote Builder" };
import "../styles/globals.css";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
	return (
		<html lang='en'>
			<body>
				<header className='border-b border-[var(--clr-border)]'>
					<div className='container flex items-center justify-between py-3'>
						<a className='font-semibold' href='/'>
							Autospec 4x4
						</a>
						<nav className='flex gap-4 text-sm'>
							<a href='/'>Quote Builder</a>
							<a href='https://autospec4x4.com.au/'>Back to store</a>
						</nav>
					</div>
				</header>

				<main className='container py-4'>{children}</main>

				<footer className='border-t border-[var(--clr-border)]'>
					<div className='container py-3 text-xs text-[var(--clr-muted)]'>© Autospec Group</div>
				</footer>
				<Toaster richColors closeButton position='top-right' />
			</body>
		</html>
	);
}
